const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: false, message: "POST only" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const name = body.name || "미입력";
  const phone = body.phone || "미입력";
  const datetime = body.datetime || "미입력";
  const service = body.service || "미입력";
  const memo = body.memo || "없음";

  // 줄바꿈 제거
  const cleanMemo = memo.replace(/\r?\n|\r/g, " ");

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const from = process.env.NCP_SENS_FROM;

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const content =
`[헤어지지말자 예약문의]
이름: ${name}
연락처: ${phone}
예약시간: ${datetime}
시술종류: ${service}
추가문의: ${cleanMemo}`;

  const requestBody = {
    type: "SMS",
    from,
    content,
    messages: [{ to: from }]
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

    const result = await response.json();
    return res.status(response.ok ? 200 : 500).json({ ok: response.ok, result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
