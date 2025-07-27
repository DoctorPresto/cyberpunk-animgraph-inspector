## A simple tool to visualize and inspect cyberpunk 2077 animgraphs


This tool allows you to visualize Cyberpunk 2077 animgraphs by loading Wolvenkit generated .animgraph.json files. 
<img width="1917" height="1080" alt="screen1" src="https://github.com/user-attachments/assets/d7bf2fc3-64df-4835-a8d4-584a2f57b921" />

Current functionality is limited to visualizing and inspecting. There are no editing functions included yet.

The Node Inspector holds all of the information you're looking for you on the individual nodes. It also allows you to jump to specific nodes by handleid and to filter the display by specific node types. 
<img width="502" height="664" alt="filter1" src="https://github.com/user-attachments/assets/eb7f39aa-06ed-4589-b7cf-dcb55ab04fd1" />

Future releases will include: editing connections between nodes, editing node properties, adding new nodes, creating entirely new graphs and exporting back to a wolvenkit compatible .animgraph.json

Known issues:
- graphs don't automatically arrange themselves properly - use the "arrange nodes" button after loading the graph to get the correct layout.
- with very large graphs, "arrange nodes" will center the viewport on the grid, but depending on how the graph branches, this might not be very close to the actual nodes. Because of the size of these graphs, the minimap is essentially useless. **If this happens to you, the best solution is to just enter a handleid into the node inspectors search function** which will immediately center the viewport on that node.
- Arrange nodes can take a while to complete for very large graphs - this will vary based on your hardware.
- 
If you run into any issues or have any feature requests outside of the aforementioned editing capabilities, please open an issue.

<img width="1920" height="1080" alt="screen2" src="https://github.com/user-attachments/assets/94c90f8b-5081-4bb0-ac5f-5c556ea1d74c" />

## Installation
There are two .zip files available to download in the release **only download one of these**:
- "cp77-animgraph-inspector-v010.zip" is the unbundled software - if you download this one, you can simply unzip it and run "Cyberpunk 2077 AnimGraph Inspector.exe"
- "Setup CP77 Animgraph Inspector v010.zip" has just a single .exe file within it - run this .exe as an administrator and it will make install the software for you
