const Aiease = require("./aiease");
const fs = require("fs");

(async () => {
  const res = new Aiease({ debug: true });
  const image = await fs.readFileSync("./src/sample.jpg");
  const styleId = 2;
  const generatedResult = await res.generateImage('filter', image, { style: styleId });
  console.log(generatedResult)
})()