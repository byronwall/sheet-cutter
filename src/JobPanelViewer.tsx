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
        {this.props.notMadePanels.map((panel) => {
          return <PanelComp panel={panel} />;
        })}

        {this.props.startPanels.map((panel) => {
          const childPanels = groups[panel.id];

          // will only have itself if none used
          if (childPanels.length === 1) {
            return null;
          }

          return (
            <div
              style={{
                marginTop: 20,
                pageBreakInside: "avoid",
                WebkitPrintColorAdjust: "exact",
              }}
              key={panel.id}
            >
              <p>
                {panel.label} - {panel.height} x {panel.width}
              </p>
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    height: panel.height * 5,
                    width: panel.width * 5,
                    border: "1px solid black",
                    position: "relative",
                    backgroundColor: "red",
                  }}
                >
                  {childPanels.map((childPanel) => {
                    if (
                      childPanel.originalSourcePos === undefined ||
                      childPanel.height <= 0 ||
                      childPanel.width <= 0
                    ) {
                      return null;
                    }

                    const isInventory = this.props.inventoryPanels.includes(
                      childPanel
                    );

                    const displayText = isInventory ? "" : childPanel.id;
                    return (
                      <div
                        key={childPanel.id}
                        style={{
                          height: childPanel.height * 5,
                          width: childPanel.width * 5,
                          border: "1px dashed #000",
                          position: "absolute",
                          top: childPanel.originalSourcePos.top * 5,
                          left: childPanel.originalSourcePos.left * 5,
                          backgroundColor: isInventory ? "#ddd" : "white",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <p>{displayText}</p>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginLeft: 10 }}>
                  {childPanels.map((child) => {
                    const isInventory = this.props.inventoryPanels.includes(
                      child
                    );

                    if (isInventory) {
                      return null;
                    }

                    return (
                      <p>
                        {child.id} - {child.label} - {child.height} x{" "}
                        {child.width}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
