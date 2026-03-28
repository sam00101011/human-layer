import { NextResponse } from "next/server";

import {
  WorldIdVerificationError,
  createWorldIdRequestConfig,
  getWorldIdClientConfig
} from "../../../../lib/world-id";

export async function GET() {
  const config = getWorldIdClientConfig();

  if (config.mode !== "remote") {
    return NextResponse.json(
      {
        error: "World ID request context is only available in remote mode"
      },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(createWorldIdRequestConfig());
  } catch (error) {
    if (error instanceof WorldIdVerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "could not create World ID request" }, { status: 500 });
  }
}
