async function main() {
  console.log('Seed disabled. Use pnpm run db:migrate:legacy to load source data.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
