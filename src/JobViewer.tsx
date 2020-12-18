import React from "react";
import { JobPanelViewer } from "./JobPanelViewer";
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

        <h2>viewer</h2>

        <JobPanelViewer
          startPanels={job.availablePanels}
          madePanels={result.panelsMade}
          inventoryPanels={result.panelInventory}
          notMadePanels={result.panelsNotPlaced}
        />
      </div>
    );
  }
}
