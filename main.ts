import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";
import {
  AssistantMessage,
  SystemMessage,
  ToolMessage,
  UserMessage,
} from "@mistralai/mistralai/models/components";

dotenv.config();

const mistral = new Mistral({
  apiKey: Deno.env.get("MISTRAL_API_KEY"),
});

const messages: Array<
  | (AssistantMessage & {
    role: "assistant";
  })
  | SystemMessage
  | ToolMessage
  | UserMessage
> = [
  {
    role: "user",
    content:
      "Make a project plan for how to copy the palantir ontology system.",
  },
];

async function run() {
  try {
    const result = await mistral.agents.complete({
      messages: messages,
      responseFormat: {
        type: "text",
      },
      agentId: "ag_019d918a71bd765a85c5c94da7dd8650",
    });
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}

if (import.meta.main) {
  run();
}
