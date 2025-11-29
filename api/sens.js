// api/sens.js
const crypto = require("crypto");

module.exports = async (req, res) => {
  // GET으로 접속하면 안내만
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "이 주소는 폼 전송(POST) 전용입니다.",
    });
  }

  // body 파싱
  let bodyData = req.body;
  if (typeof bodyData === "string") {
    try {
      bodyData = JSON.parse(bodyData);
    } catch (e) {
      bodyData = {};
    }
  }

  const name = bodyData.name || "미입력";
  const phone = bodyData.phone || "미입력";
  const datetime = bodyData.datetime || "미입력";
  const service = bodyData.service || "미선택";
  const memo = bodyData.memo || "(추가 문의 없음)";

  // 🔔 문자 받을 번호
  const OWNER_PHONE = "01042426783";

  // ── SENS 설정 ──
  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const senderNumber = process.env.NCP_SENS_CALL_NUMBER;   // ★ 수정완료

  if (!serviceId || !accessKey || !secretKey || !senderNumber) {
    return res.status(500).json({
      ok: false,
      message: "SENS 환경변수가 설정되지 않았습니다.",
    });
  }

  // ── 문자 내용 ──
  const smsContent =
    "[헤어지지말자 예약]\n" +
    `이름: ${name}\n` +
    `연락처: ${phone}\n` +
    `날짜/시간: ${datetime}\n` +
    `희망 시술: ${service}\n` +
    `추가 문의: ${memo}`;

  const timestamp = Date.now().toString();
  const method = "POST";
  const space = " ";
  const newLine = "\n";
  const url = `/sms/v2/services/${serviceId}/messages`;

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(method);
  hmac.update(space);
  hmac.update(url);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);
  const signature = hmac.digest("base64");

  const requestBody = {
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: senderNumber,
    content: smsContent,
    messages: [{ to: OWNER_PHONE.replace(/-/g, "") }],
  };

  try {
    const response = await fetch(
      `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-ncp-apigw-timestamp": timestamp,
          "x-ncp-iam-access-key": accessKey,
          "x-ncp-apigw-signature-v2": signature,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ ok: true, result });
    } else {
      return res.status(500).json({
        ok: false,
        message: "SENS 전송 중 오류",
        result,
      });
    }
  } catch (err) {
    console.error("SENS request failed:", err);
    return res.status(500).json({
      ok: false,
      message: "SENS 요청 실패",
    });
  }
};
