const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` Second Chapter Server running on http://localhost:${PORT}`);
  console.log(`================================================`);
});
