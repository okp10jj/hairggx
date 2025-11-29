// api/sens.js

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "POST 요청만 가능합니다."
    });
  }

  let bodyData = req.body;
  if (typeof bodyData === "string") {
    try { bodyData = JSON.parse(bodyData); }
    catch { bodyData = {}; }
  }

  const name = bodyData?.name || "미입력";
  const phone = bodyData?.phone || "미입력";
  const datetime = bodyData?.datetime || "미입력";
  const service = bodyData?.service || "미입력";
  const memo = bodyData?.memo || "없음";

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_CALL_NUMBER;

  if (!serviceId || !accessKey || !secretKey || !fromNumber) {
    return res.status(500).json({
      ok: false,
      message: "환경변수가 설정되지 않았습니다."
    });
  }

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  // 이모지 0개, 특수문자 0개 — 완전 안전
  const messageText =
    `[헤어지지말자 예약문의]\n\n` +
    `이름: ${name}\n` +
    `연락처: ${phone}\n` +
    `날짜/시간: ${datetime}\n` +
    `희망 시술: ${service}\n\n` +
    `추가 문의사항:\n${memo}\n`;

  const requestBody = {
    type: "SMS",
    contentType: "COMM",
    from: fromNumber,
    content: messageText,
    messages: [{ to: fromNumber }]
  };

  try {
    const response = await fetch(
      `https://sens.apigw.ntruss.com${url}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-ncp-apigw-timestamp": timestamp,
          "x-ncp-iam-access-key": accessKey,
          "x-ncp-apigw-signature-v2": signature
        },
        body: JSON.stringify(requestBody)
      }
    );

    const result = await response.json();
    console.log("SENS RESPONSE:", result);

    if (response.ok) {
      return res.status(200).json({ ok: true, result });
    } else {
      return res.status(500).json({
        ok: false,
        message: "SENS 전송 오류",
        result
      });
    }

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "SENS 서버 통신 실패",
      error: error.message
    });
  }
};
