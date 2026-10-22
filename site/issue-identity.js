// Resource identity, public numbering and shelf order have separate purposes.
export const isCustomIssue=issue=>issue.kind==='custom';
export const publicIssueNumber=issue=>isCustomIssue(issue)?null:String(issue.number??issue.id);
export const issueOrder=issue=>Number.isFinite(issue.displayOrder)?issue.displayOrder:Number(issue.id)||0;
export const newestFirst=(a,b)=>issueOrder(b)-issueOrder(a);
export const nextRegularIssueNumber=issues=>Math.max(0,...issues.filter(i=>!isCustomIssue(i)).map(i=>Number(publicIssueNumber(i))||0))+1;
export function issueAnnouncementTitle(issue,language){
 if(isCustomIssue(issue))return {zh:'NoobEye 定制特刊已上线',en:'A NoobEye special is here',ja:'NoobEye 特別号を公開しました'}[language];
 const n=publicIssueNumber(issue);
 return {zh:`NoobEye 第 ${n} 期已上线`,en:`NoobEye issue ${n} is here`,ja:`NoobEye 第${n}号を公開しました`}[language];
}
