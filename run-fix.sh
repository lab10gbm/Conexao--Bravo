#!/bin/sh
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account.json"
npx tsx fix.ts
