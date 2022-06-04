import React from "react";
import { Panel } from "./model";

interface PanelProps {
  panel: Panel;
}
interface PanelState {}

export class PanelComp extends React.Component<PanelProps, PanelState> {
  constructor(props: PanelProps) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  componentDidUpdate(prevProps: PanelProps, prevState: PanelState) {}

  render() {
    const panel = this.props.panel;
    return (
      <div
        style={{
          height: panel.height * 5,
          width: panel.width * 5,
          border: "1px solid black",
        }}
      >
        {panel.material + "\n" + panel.height + "\n" + panel.width}
      </div>
    );
  }
}
