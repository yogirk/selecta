"""Selecta agent definition compatible with ADK loaders."""

from dotenv import load_dotenv
from google.adk.agents import Agent

from .config_loader import get_model
from .custom_tools import execute_bigquery_query
from .instructions import return_instructions_bigquery

# Load environment variables if an env file is present
load_dotenv(".env")


def build_agent() -> Agent:
    return Agent(
        model=get_model(),
        name="selecta",
        description="Converts natural language questions about provided BigQuery data into executable BigQuery SQL queries and runs them.",
        instruction=return_instructions_bigquery(),
        tools=[execute_bigquery_query],
    )


def _set_agent(agent: Agent) -> Agent:
    global selecta_agent, root_agent
    selecta_agent = agent
    root_agent = agent
    return agent


def refresh_agent() -> Agent:
    try:
        return_instructions_bigquery.cache_clear()
    except AttributeError:
        pass
    return _set_agent(build_agent())


selecta_agent = build_agent()

# ADK web expects a symbol named `root_agent`
root_agent = selecta_agent

__all__ = ["selecta_agent", "root_agent", "build_agent", "refresh_agent"]
