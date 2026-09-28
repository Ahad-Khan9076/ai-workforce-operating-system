export interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

export abstract class RecruitmentEmailProvider {
  abstract send(to: string, rendered: RenderedEmail): Promise<void>;
}
