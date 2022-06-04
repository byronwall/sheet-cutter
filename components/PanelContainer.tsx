import React from "react";
import { Panel } from "./model";
import { PanelComp } from "./Panel";

interface PanelContainerProps {
  panels: Panel[];
}
interface PanelContainerState {}

export class PanelContainer extends React.Component<
  PanelContainerProps,
  PanelContainerState
> {
  constructor(props: PanelContainerProps) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  componentDidUpdate(
    prevProps: PanelContainerProps,
    prevState: PanelContainerState
  ) {}

  render() {
    return (
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {this.props.panels.map((panel) => (
          <PanelComp panel={panel} key={panel.id} />
        ))}
      </div>
    );
  }
}
