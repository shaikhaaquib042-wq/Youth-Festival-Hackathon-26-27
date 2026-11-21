export type Language = 'English' | 'Hindi' | 'Marathi';
export type VoiceGender = 'male' | 'female';
export type Verdict = 'VERIFIED' | 'FALSE' | 'MISLEADING' | 'UNVERIFIED' | 'CONFLICTING';
export interface EvidenceRecord {id:string;keywords:string[];originalClaim:string;explanation:string;verdict:Verdict;sourceTitle:string;issuingAuthority:string;publicationDate:string;sourceUrl:string;evidenceExcerpt:string;supportedLanguages:Language[];demoOnly?:boolean}
export interface ClaimResult {text:string;verdict:Verdict;explanation:string;evidence:EvidenceRecord|null}
export interface VerificationReport {input:string;inputLanguage:Language;outputLanguage:Language;claims:ClaimResult[];overall:Verdict;summary:string;recommendation:string;warningSigns:string[];}
