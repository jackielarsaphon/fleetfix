import { chipStyle } from '../utils.js';

export default function StatusChip({ status }) {
  return <span style={chipStyle(status)}>{status}</span>;
}
