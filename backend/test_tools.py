import json
from agent import log_interaction, edit_interaction, analyze_sentiment, suggest_followup, search_hcp
from db import init_db

def test_all_tools():
    print("Initializing Database...")
    init_db()

    print("\n--- Testing search_hcp ---")
    search_res = search_hcp.invoke({"query": "Smith"})
    print("search_hcp output:", search_res)

    print("\n--- Testing log_interaction ---")
    log_res = log_interaction.invoke({
        "hcp_name": "Dr. Sarah Smith",
        "topics_discussed": "New oncology drug efficacy and side effects",
        "interaction_type": "Meeting",
        "interaction_date": "2026-04-28",
        "interaction_time": "14:00",
        "attendees": ["John Doe"],
        "materials_shared": ["Brochure"],
        "samples_distributed": ["Sample A"],
        "sentiment": "Positive"
    })
    print("log_interaction output:", log_res)

    log_data = json.loads(log_res)
    if log_data.get("success"):
        interaction_id = log_data["interaction_id"]
        
        print(f"\n--- Testing edit_interaction for ID {interaction_id} ---")
        edit_res = edit_interaction.invoke({
            "id": interaction_id,
            "updates": {
                "sentiment": "Neutral",
                "topics": "Updated: New oncology drug efficacy and side effects"
            }
        })
        print("edit_interaction output:", edit_res)
    else:
        print("\n--- Skipping edit_interaction since log_interaction failed ---")

    print("\n--- Testing analyze_sentiment ---")
    sentiment_res = analyze_sentiment.invoke({"text_input": "The doctor was very happy with the results of the trial."})
    print("analyze_sentiment output:", sentiment_res)

    print("\n--- Testing suggest_followup ---")
    followup_res = suggest_followup.invoke({
        "topics": "New oncology drug",
        "materials": "Brochure",
        "sentiment": "Neutral"
    })
    print("suggest_followup output:", followup_res)

if __name__ == "__main__":
    test_all_tools()
