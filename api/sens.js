// api/sens.js
export const config = {
  api: {
    bodyParser: false,
  },
};

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "POST 전용 API입니다."
    });
  }

  // 🔥 raw body 직접 읽기 (Vercel에서 가장 안정적)
  let rawBody = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => { rawBody += chunk; });
    req.on("end", resolve);
  });

  let bodyData = {};
  try {
    bodyData = JSON.parse(rawBody);
  } catch (e) {
    console.error("JSON 파싱 오류:", e);
  }

  // ⭐ 안정적으로 값 추출
  const name = (bodyData.name || "").trim() || "미입력";
  const phone = (bodyData.phone || "").trim() || "미입력";
  const datetime = (bodyData.datetime || "").trim() || "미입력";
  const service = (bodyData.service || "").trim() || "미선택";
  const memo = (bodyData.memo || "").trim() || "(추가 문의 없음)";

  const OWNER_PHONE = "01067064733";

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const senderNumber = process.env.NCP_SENS_CALL_NUMBER;

  if (!serviceId || !accessKey || !secretKey || !senderNumber) {
    return res.status(500).json({
      ok: false,
      message: "환경변수 누락",
    });
  }

  // 문자 내용
  const smsContent =
    `[헤어지지말자 예약]\n` +
    `이름: ${name}\n` +
    `연락처: ${phone}\n` +
    `예약시간: ${datetime}\n` +
    `희망시술: ${service}\n` +
    `추가문의: ${memo}`;

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const requestBody = {
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: senderNumber,
    content: smsContent,
    messages: [{ to: OWNER_PHONE }],
  };

  try {
    const response = await fetch(`https://sens.apigw.ntruss.com${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ ok: true, result });
    } else {
      return res.status(500).json({ ok: false, result });
    }
  } catch (error) {
    console.error("SENS 오류:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};
