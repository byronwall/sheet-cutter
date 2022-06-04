import { GetStaticProps } from "next";
import { promises as fs } from "fs";
import { JobViewer } from "../components/JobViewer";
import { CutJob, CutJobResults } from "../components/model";
import {
  convertCsvToJob,
  determineCutOrderForJob,
} from "../components/PanelOperations";

import path from "path";

import { handleBooleanChange, handleStringChange } from "../components/helpers";
import { useSetState } from "react-use";

interface AppProps {
  defaultText: string;
}

interface AppState {
  inputText: string;
  kerfText: string;
  optimizeArea: boolean;

  job: CutJob | undefined;
  results: CutJobResults | undefined;
}

export default function App(props: AppProps) {
  const [state, setState] = useSetState<AppState>({
    inputText: props.defaultText,
    job: undefined,
    results: undefined,
    kerfText: "0.25",
    optimizeArea: false,
  });

  function handleProcessClick() {
    // get the input and send to job creation

    const newJob = convertCsvToJob(state.inputText);

    newJob.settings.bladeKerf = +state.kerfText;
    newJob.settings.optimizeArea = state.optimizeArea;

    console.log("job start", newJob);

    const results = determineCutOrderForJob(newJob);

    console.log("result", results);

    setState({ job: newJob, results });
  }

  return (
    <div id="container">
      <h1>sheet cutter</h1>

      <div>
        <textarea
          value={state.inputText}
          onChange={handleStringChange((inputText) => setState({ inputText }))}
        />

        <input
          value={state.kerfText}
          onChange={handleStringChange((kerfText) => setState({ kerfText }))}
        />

        <p>
          <input
            type="checkbox"
            checked={state.optimizeArea}
            onChange={handleBooleanChange((optimizeArea) =>
              setState({ optimizeArea })
            )}
          />
          optimize area?
        </p>

        <button onClick={() => handleProcessClick()}>process !</button>
      </div>
      <div>
        <h2>results</h2>
        <JobViewer job={state.job} result={state.results} />
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const filePath = path.join(process.cwd(), "components", "cut list.csv");
  const defaultText = await fs.readFile(filePath, "utf8");

  return {
    props: {
      defaultText,
    },
  };
};
