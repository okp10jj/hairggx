// api/sens.js
const crypto = require("crypto");

// 문자 깨짐 방지용 정규식 필터
function cleanText(str = "") {
  return str
    .replace(/·/g, "/")                           // 가운데점 → /
    .replace(/\r?\n|\r/g, " ")                    // 줄바꿈 제거 → 공백
    .replace(/[^\x20-\x7E가-힣0-9.,!?()\/\- ]+/g, "") // SMS 미지원 문자 제거
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "POST 요청만 가능합니다."
    });
  }

  // body 파싱
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  // 입력값 정리 + 문자 깨짐 방지
  const name = cleanText(body?.name || "미입력");
  const phone = cleanText(body?.phone || "미입력");
  const datetime = cleanText(body?.datetime || "미입력");
  const service = cleanText(body?.service || "미입력");
  const memo = cleanText(body?.memo || "없음");

  // SENS 환경변수
  const serviceId  = process.env.NCP_SENS_SERVICE_ID;
  const accessKey  = process.env.NCP_ACCESS_KEY;
  const secretKey  = process.env.NCP_SECRET_KEY;
  const fromNumber = process.env.NCP_SENS_FROM;

  if (!serviceId || !accessKey || !secretKey || !fromNumber) {
    return res.status(500).json({
      ok: false,
      message: "환경변수가 설정되지 않았습니다."
    });
  }

  // 서명 생성
  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  // 최종 문자 내용 (절대 안깨짐)
  const content =
`[헤어지지말자 예약문의]
이름: ${name}
연락처: ${phone}
예약시간: ${datetime}
시술종류: ${service}
추가문의: ${memo}`;

  const requestBody = {
    type: "SMS",
    from: fromNumber,
    content,
    messages: [{ to: fromNumber }] // 사장님 번호로 수신
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

    if (response.ok) {
      return res.status(200).json({ ok: true, result });
    } else {
      return res.status(500).json({ ok: false, result });
    }

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "SENS 서버 통신 실패",
      error: error.message
    });
  }
};
