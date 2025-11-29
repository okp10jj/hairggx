// api/sens.js
const crypto = require("crypto");

module.exports = async (req, res) => {
  // GET 접근이면 안내만
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

  // 🔍 안전하게 trim 처리
  const name = (bodyData.name || "").trim() || "미입력";
  const phone = (bodyData.phone || "").trim() || "미입력";
  const datetime = (bodyData.datetime || "").trim() || "미입력";
  const service = (bodyData.service || "").trim() || "미선택";
  const memo = (bodyData.memo || "").trim() || "(추가 문의 없음)";

  // 🔔 문자 받을 번호 (사장님 번호)
  const OWNER_PHONE = "01067064733";

  // ── 네이버 SENS 환경변수 ──
  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const senderNumber = process.env.NCP_SENS_CALL_NUMBER; // ★ 올바른 변수명 적용됨

  // 누락 체크
  if (!serviceId || !accessKey || !secretKey || !senderNumber) {
    return res.status(500).json({
      ok: false,
      message: "SENS 환경변수가 설정되지 않았습니다.",
    });
  }

  // ── 문자 내용 구성 ──
  const smsContent =
    `[헤어지지말자 미용실 예약]\n` +
    `이름: ${name}\n` +
    `연락처: ${phone}\n` +
    `희망 날짜/시간: ${datetime}\n` +
    `희망 시술: ${service}\n` +
    `추가 문의사항: ${memo}`;

  // ── 요청 서명 생성 ──
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

  // ── 요청 바디 ──
  const requestBody = {
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: senderNumber, // 발신번호
    content: smsContent,
    messages: [
      {
        to: OWNER_PHONE.replace(/-/g, ""), // 수신번호
      },
    ],
  };

  // ── API 호출 ──
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
      return res.status(200).json({
        ok: true,
        message: "문자 전송 성공",
        result,
      });
    } else {
      console.error("SENS Error:", result);
      return res.status(500).json({
        ok: false,
        message: "SENS 오류 발생",
        result,
      });
    }
  } catch (err) {
    console.error("SENS Request Failed:", err);
    return res.status(500).json({
      ok: false,
      message: "SENS 서버 요청 실패",
      error: err.message,
    });
  }
};
