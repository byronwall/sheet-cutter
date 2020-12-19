import React from "react";
import { handleBooleanChange, handleStringChange } from "./helpers";
import { JobViewer } from "./JobViewer";
import { CutJob, CutJobResults } from "./model";
import { convertCsvToJob, determineCutOrderForJob } from "./PanelOperations";

import raw from "raw.macro";
const defaultJob = raw("./cut list.csv");

interface AppProps {}
interface AppState {
  inputText: string;
  kerfText: string;
  optimizeArea: boolean;

  job: CutJob | undefined;
  results: CutJobResults | undefined;
}

export class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {
      inputText: defaultJob,
      job: undefined,
      results: undefined,
      kerfText: "0.25",
      optimizeArea: false,
    };
  }

  componentDidMount() {}

  componentDidUpdate(prevProps: AppProps, prevState: AppState) {}

  render() {
    return (
      <div id="container">
        <h1>sheet cutter</h1>

        <div>
          <textarea
            value={this.state.inputText}
            onChange={handleStringChange((inputText) =>
              this.setState({ inputText })
            )}
          />

          <input
            value={this.state.kerfText}
            onChange={handleStringChange((kerfText) =>
              this.setState({ kerfText })
            )}
          />

          <p>
            <input
              type="checkbox"
              checked={this.state.optimizeArea}
              onChange={handleBooleanChange((optimizeArea) =>
                this.setState({ optimizeArea })
              )}
            />
            optimize area?
          </p>

          <button onClick={() => this.handleProcessClick()}>process !</button>
        </div>
        <div>
          <h2>results</h2>
          <JobViewer job={this.state.job} result={this.state.results} />
        </div>
      </div>
    );
  }
  handleProcessClick(): void {
    // get the input and send to job creation

    const newJob = convertCsvToJob(this.state.inputText);

    newJob.settings.bladeKerf = +this.state.kerfText;
    newJob.settings.optimizeArea = this.state.optimizeArea;

    console.log("job start", newJob);

    const results = determineCutOrderForJob(newJob);

    console.log("result", results);

    this.setState({ job: newJob, results });
  }
}
