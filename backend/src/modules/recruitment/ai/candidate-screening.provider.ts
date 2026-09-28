import type {
  CandidateScreeningInput,
  CandidateScreeningResult,
} from './candidate-screening.types.js';

export abstract class CandidateScreeningProvider {
  abstract readonly providerName: string;
  abstract readonly modelName: string;

  abstract screen(input: CandidateScreeningInput): Promise<CandidateScreeningResult>;
}
