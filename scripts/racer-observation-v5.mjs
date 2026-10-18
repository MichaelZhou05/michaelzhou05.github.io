/** Preserve the successful grass-recovery interface; expose route orientation on asphalt. */
import { candidateState, candidateQuestion } from './racer-observation-v3.mjs';
import { orientedState, orientedQuestion } from './racer-observation-v4.mjs';
export function focusedState(course, driver, camera, index, gateDistance, previous) {
  return driver.offTrack
    ? candidateState(course, driver, camera, index, gateDistance, previous, 'absolute-named')
    : orientedState(course, driver, camera, index, gateDistance, previous);
}
export function focusedQuestion(state) {
  return state.car.surface === 'grass' ? candidateQuestion(state) : orientedQuestion(state);
}
