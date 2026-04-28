import agentApp from "./server/agent.js";
import { HumanMessage } from "@langchain/core/messages";

async function test() {
    try {
        const finalState = await agentApp.invoke({
            messages: [new HumanMessage("hello, met dr. smith")],
            user_input: "hello, met dr. smith"
        });
        console.log("Success:", finalState);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
