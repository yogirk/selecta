"""Adapter file so ADK api_server can discover the Selecta agent."""

from selecta.agent import build_agent

selecta_agent = build_agent()

# api_server looks for a variable named `root_agent`
root_agent = selecta_agent

__all__ = ["root_agent", "selecta_agent"]
