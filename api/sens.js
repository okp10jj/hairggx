// api/sens.js

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: false, message: "POST 요청만 가능합니다." });
  }

  let bodyData = req.body;
  if (typeof bodyData === "string") {
    try { bodyData = JSON.parse(bodyData); }
    catch { bodyData = {}; }
  }

  const { name, phone, datetime, service, memo } = bodyData;

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_CALL_NUMBER;

  // ⭐ 수신번호(내 폰)
  const toNumber = "01042426783";

  if (!serviceId || !accessKey || !secretKey || !fromNumber) {
    return res.status(500).json({ ok: false, message: "환경변수가 설정되지 않았습니다." });
  }

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;  // 🔥 v3 로 변경

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(`POST ${url}\n${timestamp}\n${accessKey}`);
  const signature = hmac.digest("base64");

  const messageText =
`HairGG 예약문의
이름: ${name}
연락처: ${phone}
방문희망: ${datetime}
시술: ${service}
메모: ${memo}`;

  const requestBody = {
    type: "SMS",
    from: fromNumber,
    content: messageText,
    messages: [{ to: toNumber }]
  };

  try {
    const response = await fetch(`https://sens.apigw.ntruss.com${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature
      },
      body: JSON.stringify(requestBody)
    });

    const json = await response.json();

    if (response.ok) {
      return res.status(200).json({ ok: true, result: json });
    } else {
      return res.status(500).json({ ok: false, message: "SENS 전송 오류", result: json });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: "SENS 서버 통신 실패", error: err.message });
  }
};
