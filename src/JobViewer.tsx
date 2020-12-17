import React from "react";
import { CutJob, CutJobResults } from "./model";
import { PanelComp } from "./Panel";
import { PanelContainer } from "./PanelContainer";

interface JobViewerProps {
  job?: CutJob;
  result?: CutJobResults;
}
interface JobViewerState {}

export class JobViewer extends React.Component<JobViewerProps, JobViewerState> {
  constructor(props: JobViewerProps) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  componentDidUpdate(prevProps: JobViewerProps, prevState: JobViewerState) {}

  render() {
    const job = this.props.job;
    const result = this.props.result;

    if (job === undefined || result === undefined) {
      return "job or result undefined...";
    }

    return (
      <div>
        <p>JobViewer</p>

        <h2>starting panels</h2>

        <PanelContainer panels={job.availablePanels} />

        <h2>panels not made</h2>

        <PanelContainer panels={result.panelsNotPlaced} />

        <h2>panels made</h2>

        <PanelContainer panels={result.panelsMade} />

        <h2>leftover panels</h2>

        <PanelContainer panels={result.panelInventory} />
      </div>
    );
  }
}
