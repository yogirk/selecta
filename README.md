# conv-analytics-demo
- Conversational Analytics Demo code shared by Puneet and Pawan Rana
- We made changes to make it work locally
- Used Chicago taxi trips, from public BQ datasets, updated the utility functions to use this data source
- Updated instructions.yaml with taxi_trips schema information, some example queries etc
- To make this work local, I had to remove dependency on dataplex metadata.
- Added a function in utility to get table metadata, edit instructions.py etc
- Fix entrypoint.sh to include frontend build step
