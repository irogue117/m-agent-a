import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";
import {
  ConversationAppendRequest,
  ConversationInputs,
  ConversationRequest,
  ConversationResponse,
  FunctionT,
  FunctionTool,
  MessageOutputEntry,
} from "@mistralai/mistralai/models/components";

dotenv.config();

const mistral = new Mistral({
  apiKey: Deno.env.get("MISTRAL_API_KEY"),
});

const coding_orchestrator_agentID = Deno.env.get("coding_orch_ID");
const coding_developer_agentID = Deno.env.get("coding_dev_ID");
const coding_validator_agentID = Deno.env.get("coding_val_ID");

// Convert the mistral SDK internal FunctionT (which is nicer for us to define)
// to the actual object we need to give to the SDK.
const fnTool = (fn: FunctionT): FunctionTool => ({
  type: "function",
  function: fn,
});

// Same as fnTool but for an array.
const fnTools = (...fns: FunctionT[]): FunctionTool[] => fns.map(fnTool);

const coding_orchestrator_tools: FunctionTool[] = fnTools();

const coding_developer_tools: FunctionTool[] = fnTools();

const coding_validator_tools: FunctionTool[] = fnTools();

const controller = new AbortController();

type ConversationID = string;

function printOutput(content: string) {
  console.log("\n");
  console.log(content);
  console.log("\n");

  const width = Deno.consoleSize().columns ?? 80;
  console.log("-".repeat(width));
}

async function deleteConversation(convId: ConversationID) {
  await mistral.beta.conversations.delete({
    conversationId: convId,
  });
  console.log("Conversation deleted");
}

async function firstTurn(signal: AbortSignal): Promise<ConversationID> {
  signal.throwIfAborted();
  let first: string | null = null;
  while (first === null) {
    first = prompt("First message (ctrl-c now to exit):");
  }

  const msg: ConversationInputs = [
    {
      role: "user",
      content: first,
    },
  ];

  const response: ConversationResponse = await mistral.beta.conversations
    .start(
      {
        agentId: coding_orchestrator_agentID,
        inputs: msg,
        tools: coding_orchestrator_tools,
      },
      {
        signal: signal,
      },
    );

  const resMsg = response.outputs[0] as MessageOutputEntry;
  printOutput(resMsg.content as string);
  return response.conversationId as ConversationID;
}

async function chatTurn(conversationId: ConversationID, signal: AbortSignal) {
  signal.throwIfAborted();
  let nMsg: string | null = null;
  while (nMsg === null) {
    nMsg = prompt("Prompt (/end to stop):");
  }

  // Execute commands here.

  if (nMsg === "/end") {
    await deleteConversation(conversationId);
    return;
  }

  const inputs: ConversationInputs = [{
    role: "user",
    content: nMsg,
  }];

  const newResponse: ConversationResponse = await mistral.beta.conversations
    .append({
      conversationId: conversationId,
      conversationAppendRequest: {
        inputs: inputs,
      },
    }, {
      signal: signal,
    });

  newResponse.outputs.forEach((v) => {
    if (v.type === "message.output") {
      printOutput(v.content as string);
    } else {
      printOutput(JSON.stringify(v));
    }
  });

  await chatTurn(conversationId, signal);
  signal.throwIfAborted();
}

async function run() {
  const conversationID: string = await firstTurn(controller.signal);

  chatTurn(conversationID, controller.signal);

  // Check for steer? Use abort controller to interrupt.
}

if (import.meta.main) {
  run();
}
