import _ from "lodash";
import React from "react";

import { Panel } from "./model";
import { PanelComp } from "./Panel";

interface JobPanelViewerProps {
  startPanels: Panel[];
  madePanels: Panel[];
  inventoryPanels: Panel[];
  notMadePanels: Panel[];
}
interface JobPanelViewerState {}

export class JobPanelViewer extends React.Component<
  JobPanelViewerProps,
  JobPanelViewerState
> {
  constructor(props: JobPanelViewerProps) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  componentDidUpdate(
    prevProps: JobPanelViewerProps,
    prevState: JobPanelViewerState
  ) {}

  render() {
    const panelsToGroup = [
      ...this.props.madePanels,
      ...this.props.inventoryPanels,
    ];
    // built list of all panels and assemble parent/child

    // group by original source

    const groups = _.groupBy(panelsToGroup, (c) => c.originalSource);

    console.log("groups", groups, this.props);

    return (
      <div>
        <p>JobPanelViewer</p>

        {this.props.notMadePanels.map((panel) => {
          return <PanelComp panel={panel} />;
        })}

        {this.props.startPanels.map((panel) => {
          const childPanels = groups[panel.id];
          return (
            <div>
              <p>{panel.id}</p>
              <div
                style={{
                  height: panel.height * 5,
                  width: panel.width * 5,
                  border: "2px solid black",
                  position: "relative",
                  marginTop: 20,
                }}
              >
                {childPanels.map((childPanel) => {
                  if (childPanel.originalSourcePos === undefined) {
                    return null;
                  }

                  const isInventory = this.props.inventoryPanels.includes(
                    childPanel
                  );

                  return (
                    <div
                      style={{
                        height: childPanel.height * 5,
                        width: childPanel.width * 5,
                        border: "1px solid red",
                        position: "absolute",
                        top: childPanel.originalSourcePos.top * 5,
                        left: childPanel.originalSourcePos.left * 5,
                        backgroundColor: isInventory ? "red" : "white",
                      }}
                    ></div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
