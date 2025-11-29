// api/sens.js

const crypto = require("crypto");
const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "POST 요청만 가능합니다."
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

  // 값 정리
  const name = bodyData?.name || "미입력";
  const phone = bodyData?.phone || "미입력";
  const datetime = bodyData?.datetime || "미입력";
  const service = bodyData?.service || "미입력";
  const memo = bodyData?.memo || "없음";

  // NCP 환경변수
  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_FROM;

  if (!serviceId || !accessKey || !secretKey || !fromNumber) {
    return res.status(500).json({
      ok: false,
      message: "환경변수가 누락되었습니다."
    });
  }

  const url = `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`;
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST /sms/v2/services/${serviceId}/messages\n${timestamp}\n${accessKey}`)
    .digest("base64");

  // 문자 내용 (여기에 희망시술/문의사항 100% 포함됨)
  const messageText =
    `📌 헤어지지말자 예약문의\n\n` +
    `🧑 고객명: ${name}\n` +
    `📞 연락처: ${phone}\n` +
    `📆 예약 희망: ${datetime}\n` +
    `✂️ 희망 시술: ${service}\n` +
    `📝 추가 문의:\n${memo}\n`;

  try {
    const response = await axios({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      data: {
        type: "SMS",
        from: fromNumber,
        content: messageText,
        messages: [{ to: fromNumber }],
      },
    });

    return res.status(200).json({
      ok: true,
      result: response.data,
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.response?.data || error.message,
    });
  }
};
