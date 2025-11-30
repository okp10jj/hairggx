// api/sens.js
const crypto = require("crypto");

module.exports = async (req, res) => {
  console.log("===== 📩 SENS 문자전송 API 시작 =====");

  // POST 이외 차단
  if (req.method !== "POST") {
    console.log("❌ POST 아님 — 거부");
    return res.status(200).json({ ok: false, message: "POST 요청만 가능합니다." });
  }

  console.log("📥 RAW BODY:", req.body);

  // body 파싱
  let bodyData = req.body;
  if (typeof bodyData === "string") {
    try { bodyData = JSON.parse(bodyData); }
    catch { bodyData = {}; }
  }

  console.log("📦 Parsed BODY:", bodyData);

  const { name = "", phone = "", datetime = "", service = "", memo = "" } = bodyData;

  // 환경변수
  const serviceId  = process.env.NCP_SENS_SERVICE_ID;
  const accessKey  = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey  = process.env.NCP_SENS_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_CALL_NUMBER;

  console.log("🔧 ENV CHECK:", {
    serviceId,
    accessKey,
    secretKey: secretKey ? "(OK)" : "MISSING",
    fromNumber
  });

  if (!serviceId || !accessKey || !secretKey || !fromNumber) {
    console.log("❌ 환경변수 누락");
    return res.status(500).json({
      ok: false,
      message: "환경변수가 설정되지 않았습니다."
    });
  }

  const toNumber = "01042426783"; // 수신자 번호

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  // 서명(Signature) 생성
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(`POST ${url}\n${timestamp}\n${accessKey}`);
  const signature = hmac.digest("base64");

  console.log("🔐 SIGNATURE 생성완료:", signature);

  // 문자 내용 (LMS는 줄바꿈 허용)
  const messageText =
`[HairGG 예약문의]

이름: ${name}
연락처: ${phone}
방문희망: ${datetime}
시술: ${service}
메모: ${memo}
`;

  const requestBody = {
    type: "LMS",               // LMS로 고정 → 줄바꿈/긴문자 OK
    from: fromNumber,
    subject: "HairGG 예약문의",
    content: messageText,
    messages: [{ to: toNumber }]
  };

  console.log("📤 Request URL:", `https://sens.apigw.ntruss.com${url}`);
  console.log("📤 Request Body:", requestBody);

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

    console.log("📬 NCP Response Status:", response.status);

    const json = await response.json().catch(() => null);
    console.log("📬 NCP Response JSON:", json);

    if (response.ok) {
      console.log("✅ 문자 전송 성공");
      return res.status(200).json({ ok: true, result: json });
    }

    console.log("❌ 문자 전송 오류:", json);
    return res.status(500).json({
      ok: false,
      message: "SENS 전송 오류",
      result: json
    });

  } catch (err) {
    console.log("💥 서버 통신 실패:", err.message);
    return res.status(500).json({
      ok: false,
      message: "SENS 서버 통신 실패",
      error: err.message
    });
  }
};