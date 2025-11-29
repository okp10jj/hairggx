const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "POST only"
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { body = {}; }
  }

  const name = body.name || "";
  const phone = body.phone || "";
  const datetime = body.datetime || "";
  const service = body.service || "";
  const memo = body.memo || "";

  const serviceId = process.env.NCP_SENS_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_CALL_NUMBER;

  // ← 메시지 문자열 완전 ASCII+한글 버전
  const content =
`[헤어지지말자 예약문의]

이름: ${name}
연락처: ${phone}
예약시간: ${datetime}
시술종류: ${service}
추가문의: ${memo}
`;

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const bodyJson = {
    type: "SMS",
    from: fromNumber,
    content,
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
        body: JSON.stringify(bodyJson)
      }
    );

    const result = await response.json();
    console.log("SENS RES:", result);

    if (result.status === "OK" || response.ok) {
      return res.json({ ok: true });
    }

    return res.status(500).json({ ok: false, error: result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
