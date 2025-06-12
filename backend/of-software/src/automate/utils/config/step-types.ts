export interface Step {
  type: string;
  key?: string;
  value?: string;
  selector?: string;
  btnSelector?: string;
  childs?: {
    yes?: Step[] | Step;
    no?: Step[] | Step;
  };
}
