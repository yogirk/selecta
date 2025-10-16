"""Selecta agent definition compatible with ADK loaders."""

from dotenv import load_dotenv
from google.adk.agents import Agent

from . import storage
from .config_loader import get_model
from .custom_tools import execute_bigquery_query
from .instructions import return_instructions_bigquery

# Load environment variables if an env file is present
load_dotenv("env")

# Ensure persistence tables exist even when the agent is loaded outside FastAPI
storage.init_db()


selecta_agent = Agent(
    model=get_model(),
    name="selecta",
    description="Converts natural language questions about provided BigQuery data into executable BigQuery SQL queries and runs them.",
    instruction=return_instructions_bigquery(),
    tools=[execute_bigquery_query],
)

# ADK web expects a symbol named `root_agent`
root_agent = selecta_agent

__all__ = ["selecta_agent", "root_agent"]
