module.exports = async (req, res) => {
  console.log("📩 sens.js 호출됨");

  if (req.method !== "POST") {
    return res.status(200).json({ ok: false, message: "POST만 허용" });
  }

  console.log("📥 req.body:", req.body);

  let bodyData = req.body;
  if (typeof bodyData === "string") {
    try { bodyData = JSON.parse(bodyData); }
    catch {
      console.log("❌ body 파싱 실패");
      return res.status(400).json({ ok: false, message: "JSON 파싱 실패" });
    }
  }

  console.log("📦 Parsed:", bodyData);

  return res.status(200).json({
    ok: true,
    received: bodyData
  });
};