import { Redirect, useLocation } from "wouter";
import { API_CLIENT } from "../api";
import { useCallback, useEffect, useReducer, useState } from "react";
import { icw86Options } from "../language/options";
import { VM } from "../language/vm";
import { assemble } from "../language/assemble";
import Button from "../components/Button";
import { prettyPrint } from "../language/insn";

const PROGRAM_ID_REGEX = /^\/programs\/(.*)\/debugger$/;

const leftPad = (n: number): string => {
  let s = n.toString();
  while (s.length < 4) {
    s = "0" + s;
  }
  return s;
};

const ProgramDebuggerPage = () => {
  const [location, setLocation] = useLocation();

  const match = PROGRAM_ID_REGEX.exec(location);
  if (match === null) {
    return <Redirect to="/" />;
  }

  const programId = match[1];

  const [_ignored, forceUpdate] = useReducer((x) => x + 1, 0);
  const [loading, setLoading] = useState(true);
  const [vm, setVm] = useState(() => VM.create(icw86Options, []));

  useEffect(() => {
    API_CLIENT.getProgram(programId).then((program) => {
      setLoading(false);
      if (program === null) {
        setLocation("/programs");
        return;
      }

      const warrior = assemble(program.sourceCode);
      setVm(VM.create(icw86Options, [warrior]));
    });
  }, [programId]);

  const executeStep = useCallback(() => {
    vm.executeCycle();
    forceUpdate();
  }, [forceUpdate, vm]);

  const executeRun = useCallback(() => {
    const result = vm.execute();
    console.log(result);
    forceUpdate();
  }, [vm]);

  const taskQueue = vm.vmWarriors.length > 0 ? vm.vmWarriors[0].taskQueue : [];

  return (
    <div>
      {loading ? (
        <span>Loading...</span>
      ) : (
        <div>
          <div style={{ display: "flex" }}>
            <div style={{ width: "50%" }}>
              <div>Cycle Count: {vm.numCycles}</div>
              <div>
                PCs:{" "}
                {taskQueue
                  .map(
                    ({ taskID, instructionPointer }) =>
                      `#${taskID} => ${instructionPointer}`
                  )
                  .join(", ")}
              </div>
            </div>
            <pre style={{ height: "500px", overflow: "scroll", width: "50%" }}>
              {vm.core
                .map(
                  (insn, instructionPointer) =>
                    `${
                      taskQueue.find(
                        (task) => task.instructionPointer === instructionPointer
                      )
                        ? "*"
                        : " "
                    } ${leftPad(instructionPointer)} ${prettyPrint(insn)}`
                )
                .join("\n")}
            </pre>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Button label="Step" onClick={executeStep} />
            <Button label="Run" onClick={executeRun} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramDebuggerPage;
