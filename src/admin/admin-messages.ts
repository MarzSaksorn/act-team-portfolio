import type { Locale, SiteCopyKey } from '../types/site-content';

type AdminMessages = {
  studioTitle: string;
  loginTitle: string;
  editorTitle: string;
  loginHelp: string;
  username: string;
  password: string;
  signIn: string;
  signingIn: string;
  signOut: string;
  checkingSession: string;
  loadingContent: string;
  backendUnavailable: string;
  editorLoadFailed: string;
  localeEnglish: string;
  localeThai: string;
  sections: { siteCopy: string; upcomingEvent: string; projects: string; competitions: string };
  siteCopyFields: Record<SiteCopyKey, string>;
  eventFields: {
    name: string; branch: string; note: string; startDate: string; endDate: string;
    applicationDeadline: string; finalStartDate: string; finalEndDate: string;
    status: string; registration: string; officialUrl: string;
  };
  projectFields: {
    title: string; summary: string; status: string; problem: string; businessModel: string;
    dates: string; contributionName: string; contributionDescription: string;
    linkLabel: string; linkUrl: string;
  };
  competitionFields: {
    name: string; year: string; participants: string; stage: string;
    contribution: string; evidenceUrl: string;
  };
  actions: {
    saveSiteCopy: string; saveEvent: string; addProject: string; createProject: string;
    saveProject: string; cancel: string; addContribution: string; removeContribution: string;
    addLink: string; removeLink: string; addFounderRecord: string; addActRecord: string;
    createFounderRecord: string; createActRecord: string; saveCompetition: string;
    reloadLatest: string;
    editProject: (title: string) => string; deleteProject: (title: string) => string;
    editCompetition: (title: string) => string; deleteCompetition: (title: string) => string;
    delete: string; previousProjects: string; nextProjects: string;
    previousFounderRecords: string; nextFounderRecords: string;
    previousActRecords: string; nextActRecords: string;
  };
  groups: {
    founderTitle: string; founderDescription: string; founderRegion: string;
    actTitle: string; actDescription: string; actRegion: string;
  };
  values: {
    planned: string; confirmed: string; completed: string; postponed: string; cancelled: string;
    notRegistered: string; registered: string; registrationClosed: string;
    projectPlanned: string; inProgress: string; projectCompleted: string;
  };
  feedback: {
    invalidCredentials: string; validationSummary: string; fieldInvalid: string; saveError: string;
    sessionExpired: string; conflict: string; siteCopySaved: string; eventSaved: string;
    reloadConflictPrompt: string; latestReloaded: string;
    projectCreated: string; projectSaved: string; projectDeleted: string;
    competitionCreated: string; competitionSaved: string; competitionDeleted: string;
    noProjects: string; noFounderRecords: string; noActRecords: string;
    deleteProjectPrompt: string; deleteCompetitionPrompt: string;
    pageLabel: (current: number, total: number) => string;
    itemsPerPage: string;
  };
};

const adminMessages = {
  en: {
    studioTitle: 'ACT content studio',
    loginTitle: 'Sign in to edit ACT content',
    editorTitle: 'ACT content editor',
    loginHelp: 'This private workspace updates the live portfolio on its self-hosted server.',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signOut: 'Sign out',
    checkingSession: 'Checking your admin session…',
    loadingContent: 'Loading editable content…',
    backendUnavailable: 'The self-hosted admin backend is unavailable here. Preview edits will not be saved.',
    editorLoadFailed: 'The editor could not load its content. Check the self-hosted server and try again.',
    localeEnglish: 'English',
    localeThai: 'Thai',
    sections: {
      siteCopy: 'Site copy',
      upcomingEvent: 'Upcoming event',
      projects: 'Projects',
      competitions: 'Competitions',
    },
    siteCopyFields: {
      homeTitle: 'Home title',
      homeDescription: 'Home description',
      heroLabel: 'Hero team label',
      heroLine1: 'Hero headline',
      heroLine2: 'Hero subhead',
      heroBody: 'Hero description',
      forming: 'Team formation heading',
      teamBody: 'Team description',
      teamCount: 'Team count label',
      teamCountValue: 'Team count value',
      teamStatus: 'Team status',
      focusLabel: 'Focus section label',
      focusHeading: 'Focus heading',
      ai: 'AI focus title',
      aiText: 'AI focus description',
      sustainable: 'Sustainability focus title',
      sustainableText: 'Sustainability focus description',
      business: 'Business focus title',
      businessText: 'Business focus description',
      joinLabel: 'Recruitment section label',
      joinHeading: 'Recruitment heading',
      joinBody: 'Recruitment description',
      discord: 'Discord action label',
      inviteSoon: 'Discord invite status',
      onboarding: 'Welcome-area guidance',
    },
    eventFields: {
      name: 'Event name', branch: 'Event location or branch', note: 'Event note',
      startDate: 'Event start date', endDate: 'Event end date', applicationDeadline: 'Application deadline',
      finalStartDate: 'Final round start date', finalEndDate: 'Final round end date',
      status: 'Event status', registration: 'Registration status', officialUrl: 'Official event URL',
    },
    projectFields: {
      title: 'Project title', summary: 'Project summary', status: 'Project status',
      problem: 'Problem', businessModel: 'Business model', dates: 'Project dates or timeframe',
      contributionName: 'Contributor name', contributionDescription: 'Contribution description',
      linkLabel: 'Public link label', linkUrl: 'Public HTTPS URL',
    },
    competitionFields: {
      name: 'Competition name', year: 'Competition year', participants: 'Participants (comma-separated)',
      stage: 'Competition stage', contribution: 'Contribution', evidenceUrl: 'Evidence HTTPS URL',
    },
    actions: {
      saveSiteCopy: 'Save site copy', saveEvent: 'Save upcoming event', addProject: 'Add project',
      createProject: 'Create project', saveProject: 'Save project', cancel: 'Cancel',
      addContribution: 'Add contributor', removeContribution: 'Remove contributor',
      addLink: 'Add public link', removeLink: 'Remove public link',
      addFounderRecord: 'Add founder pre-ACT record', addActRecord: 'Add ACT competition record',
      createFounderRecord: 'Create founder pre-ACT record', createActRecord: 'Create ACT competition record',
      saveCompetition: 'Save competition record',
      reloadLatest: 'Reload latest content (discard drafts)',
      editProject: (title) => `Edit project: ${title}`, deleteProject: (title) => `Delete project: ${title}`,
      editCompetition: (title) => `Edit competition: ${title}`, deleteCompetition: (title) => `Delete competition: ${title}`,
      delete: 'Delete',
      previousProjects: 'Previous projects page', nextProjects: 'Next projects page',
      previousFounderRecords: 'Previous founder records page', nextFounderRecords: 'Next founder records page',
      previousActRecords: 'Previous ACT records page', nextActRecords: 'Next ACT records page',
    },
    groups: {
      founderTitle: 'Founder history before ACT',
      founderDescription: 'Individual competition experience from before ACT was formed. Keep each participant credited accurately.',
      founderRegion: 'Founder history before ACT',
      actTitle: 'ACT competition history',
      actDescription: 'Competitions entered together as ACT. A planned event is not a confirmed entry.',
      actRegion: 'ACT competition history',
    },
    values: {
      planned: 'Planned', confirmed: 'Confirmed', completed: 'Completed', postponed: 'Postponed', cancelled: 'Cancelled',
      notRegistered: 'Not registered', registered: 'Registered', registrationClosed: 'Registration closed',
      projectPlanned: 'Planned', inProgress: 'In progress', projectCompleted: 'Completed',
    },
    feedback: {
      invalidCredentials: 'The username or password is incorrect.',
      validationSummary: 'Please complete both language fields before saving.',
      fieldInvalid: 'Please review this field.',
      saveError: 'The changes could not be saved. Review the form and try again.',
      sessionExpired: 'Your admin session has expired. Sign in again.',
      conflict: 'Another save changed this content. Your draft is still here; reload the latest content before saving again.',
      reloadConflictPrompt: 'Reload the latest server content? This will discard your unsaved draft.',
      latestReloaded: 'Latest server content loaded. Review the changes before editing.',
      siteCopySaved: 'Site copy saved.', eventSaved: 'Upcoming event saved.',
      projectCreated: 'Project created.', projectSaved: 'Project saved.', projectDeleted: 'Project deleted.',
      competitionCreated: 'Competition record created.', competitionSaved: 'Competition record saved.', competitionDeleted: 'Competition record deleted.',
      noProjects: 'No projects have been added yet.',
      noFounderRecords: 'No founder pre-ACT records have been added.',
      noActRecords: 'No ACT competition records have been added.',
      deleteProjectPrompt: 'Delete this project? This change cannot be undone.',
      deleteCompetitionPrompt: 'Delete this competition record? This change cannot be undone.',
      pageLabel: (current, total) => `Page ${current} of ${total}`,
      itemsPerPage: 'Items per page',
    },
  },
  th: {
    studioTitle: 'เครื่องมือจัดการเนื้อหา ACT',
    loginTitle: 'เข้าสู่ระบบเพื่อแก้ไขเนื้อหา ACT',
    editorTitle: 'ตัวแก้ไขเนื้อหา ACT',
    loginHelp: 'พื้นที่ส่วนตัวนี้ใช้แก้ไขพอร์ตโฟลิโอที่เผยแพร่จากเซิร์ฟเวอร์ของทีม',
    username: 'ชื่อผู้ใช้',
    password: 'รหัสผ่าน',
    signIn: 'เข้าสู่ระบบ',
    signingIn: 'กำลังเข้าสู่ระบบ…',
    signOut: 'ออกจากระบบ',
    checkingSession: 'กำลังตรวจสอบเซสชันผู้ดูแล…',
    loadingContent: 'กำลังโหลดเนื้อหาที่แก้ไขได้…',
    backendUnavailable: 'ไม่พบระบบจัดการที่เซิร์ฟเวอร์ของทีม การแก้ไขใน Preview จะไม่ถูกบันทึก',
    editorLoadFailed: 'โหลดเนื้อหาไม่สำเร็จ โปรดตรวจสอบเซิร์ฟเวอร์แล้วลองอีกครั้ง',
    localeEnglish: 'ภาษาอังกฤษ',
    localeThai: 'ภาษาไทย',
    sections: {
      siteCopy: 'ข้อความเว็บไซต์',
      upcomingEvent: 'การแข่งขันที่กำลังจะมาถึง',
      projects: 'โปรเจกต์',
      competitions: 'การแข่งขัน',
    },
    siteCopyFields: {
      homeTitle: 'ชื่อหน้าแรก',
      homeDescription: 'คำอธิบายหน้าแรก',
      heroLabel: 'ป้ายชื่อทีมส่วนหัว',
      heroLine1: 'พาดหัวหลัก',
      heroLine2: 'พาดหัวรอง',
      heroBody: 'คำอธิบายส่วนหัว',
      forming: 'หัวข้อการก่อตั้งทีม',
      teamBody: 'คำอธิบายทีม',
      teamCount: 'ป้ายจำนวนสมาชิก',
      teamCountValue: 'จำนวนสมาชิก',
      teamStatus: 'สถานะทีม',
      focusLabel: 'ป้ายส่วนความสนใจ',
      focusHeading: 'หัวข้อความสนใจ',
      ai: 'หัวข้อความสนใจด้าน AI',
      aiText: 'คำอธิบายด้าน AI',
      sustainable: 'หัวข้อความสนใจด้านความยั่งยืน',
      sustainableText: 'คำอธิบายด้านความยั่งยืน',
      business: 'หัวข้อความสนใจด้านธุรกิจ',
      businessText: 'คำอธิบายด้านธุรกิจ',
      joinLabel: 'ป้ายส่วนรับสมาชิก',
      joinHeading: 'หัวข้อรับสมาชิก',
      joinBody: 'คำอธิบายการรับสมาชิก',
      discord: 'ข้อความปุ่ม Discord',
      inviteSoon: 'สถานะคำเชิญ Discord',
      onboarding: 'คำแนะนำพื้นที่ต้อนรับ',
    },
    eventFields: {
      name: 'ชื่อการแข่งขัน', branch: 'สถานที่หรือสาขา', note: 'หมายเหตุการแข่งขัน',
      startDate: 'วันเริ่มการแข่งขัน', endDate: 'วันสิ้นสุดการแข่งขัน', applicationDeadline: 'วันปิดรับสมัคร',
      finalStartDate: 'วันเริ่มรอบชิงชนะเลิศ', finalEndDate: 'วันสิ้นสุดรอบชิงชนะเลิศ',
      status: 'สถานะการแข่งขัน', registration: 'สถานะการสมัคร', officialUrl: 'ลิงก์ทางการของงาน',
    },
    projectFields: {
      title: 'ชื่อโปรเจกต์', summary: 'สรุปโปรเจกต์', status: 'สถานะโปรเจกต์',
      problem: 'ปัญหาที่ต้องการแก้', businessModel: 'โมเดลธุรกิจ', dates: 'วันที่หรือช่วงเวลาโปรเจกต์',
      contributionName: 'ชื่อผู้ร่วมสร้าง', contributionDescription: 'รายละเอียดผลงานของสมาชิก',
      linkLabel: 'ชื่อแสดงของลิงก์สาธารณะ', linkUrl: 'ลิงก์ HTTPS สาธารณะ',
    },
    competitionFields: {
      name: 'ชื่อการแข่งขัน', year: 'ปีที่แข่งขัน', participants: 'ผู้เข้าร่วม (คั่นด้วยจุลภาค)',
      stage: 'ระดับหรือสถานะการแข่งขัน', contribution: 'บทบาทและผลงาน', evidenceUrl: 'ลิงก์ HTTPS หลักฐาน',
    },
    actions: {
      saveSiteCopy: 'บันทึกเนื้อหาเว็บไซต์', saveEvent: 'บันทึกการแข่งขันที่กำลังจะมาถึง', addProject: 'เพิ่มโปรเจกต์',
      createProject: 'สร้างโปรเจกต์', saveProject: 'บันทึกโปรเจกต์', cancel: 'ยกเลิก',
      addContribution: 'เพิ่มผู้ร่วมสร้าง', removeContribution: 'นำผู้ร่วมสร้างออก',
      addLink: 'เพิ่มลิงก์สาธารณะ', removeLink: 'นำลิงก์สาธารณะออก',
      addFounderRecord: 'เพิ่มประวัติก่อนมี ACT', addActRecord: 'เพิ่มประวัติการแข่งขันของ ACT',
      createFounderRecord: 'สร้างประวัติก่อนมี ACT', createActRecord: 'สร้างประวัติการแข่งขันของ ACT',
      saveCompetition: 'บันทึกประวัติการแข่งขัน',
      reloadLatest: 'โหลดข้อมูลล่าสุด (ละทิ้งฉบับร่าง)',
      editProject: (title) => `แก้ไขโปรเจกต์: ${title}`, deleteProject: (title) => `ลบโปรเจกต์: ${title}`,
      editCompetition: (title) => `แก้ไขการแข่งขัน: ${title}`, deleteCompetition: (title) => `ลบการแข่งขัน: ${title}`,
      delete: 'ลบ',
      previousProjects: 'หน้าโปรเจกต์ก่อนหน้า', nextProjects: 'หน้าโปรเจกต์ถัดไป',
      previousFounderRecords: 'หน้าประวัติผู้ก่อตั้งก่อนหน้า', nextFounderRecords: 'หน้าประวัติผู้ก่อตั้งถัดไป',
      previousActRecords: 'หน้าประวัติ ACT ก่อนหน้า', nextActRecords: 'หน้าประวัติ ACT ถัดไป',
    },
    groups: {
      founderTitle: 'ประวัติผู้ก่อตั้งก่อนมี ACT',
      founderDescription: 'ประสบการณ์การแข่งขันรายบุคคลก่อนก่อตั้ง ACT โปรดระบุผู้เข้าร่วมให้ตรงตามจริง',
      founderRegion: 'ประวัติผู้ก่อตั้งก่อนมี ACT',
      actTitle: 'ประวัติการแข่งขันของ ACT',
      actDescription: 'การแข่งขันที่เข้าร่วมด้วยกันในนาม ACT การวางแผนยังไม่ใช่การเข้าร่วมที่ยืนยันแล้ว',
      actRegion: 'ประวัติการแข่งขันของ ACT',
    },
    values: {
      planned: 'วางแผนไว้', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', postponed: 'เลื่อนออกไป', cancelled: 'ยกเลิก',
      notRegistered: 'ยังไม่ได้สมัคร', registered: 'สมัครแล้ว', registrationClosed: 'ปิดรับสมัครแล้ว',
      projectPlanned: 'วางแผนไว้', inProgress: 'กำลังดำเนินการ', projectCompleted: 'เสร็จสมบูรณ์',
    },
    feedback: {
      invalidCredentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      validationSummary: 'โปรดกรอกข้อมูลทั้งภาษาอังกฤษและภาษาไทยก่อนบันทึก',
      fieldInvalid: 'โปรดตรวจสอบข้อมูลในช่องนี้',
      saveError: 'บันทึกข้อมูลไม่สำเร็จ โปรดตรวจสอบแบบฟอร์มแล้วลองอีกครั้ง',
      sessionExpired: 'เซสชันผู้ดูแลหมดอายุแล้ว โปรดเข้าสู่ระบบอีกครั้ง',
      conflict: 'มีการบันทึกข้อมูลนี้จากที่อื่น ฉบับร่างของคุณยังอยู่ โปรดโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง',
      reloadConflictPrompt: 'โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์หรือไม่? ฉบับร่างที่ยังไม่ได้บันทึกจะถูกละทิ้ง',
      latestReloaded: 'โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์แล้ว โปรดตรวจสอบก่อนแก้ไข',
      siteCopySaved: 'บันทึกเนื้อหาเว็บไซต์แล้ว', eventSaved: 'บันทึกการแข่งขันที่กำลังจะมาถึงแล้ว',
      projectCreated: 'สร้างโปรเจกต์แล้ว', projectSaved: 'บันทึกโปรเจกต์แล้ว', projectDeleted: 'ลบโปรเจกต์แล้ว',
      competitionCreated: 'สร้างประวัติการแข่งขันแล้ว', competitionSaved: 'บันทึกประวัติการแข่งขันแล้ว', competitionDeleted: 'ลบประวัติการแข่งขันแล้ว',
      noProjects: 'ยังไม่มีโปรเจกต์',
      noFounderRecords: 'ยังไม่มีประวัติการแข่งขันก่อนก่อตั้ง ACT',
      noActRecords: 'ยังไม่มีประวัติการแข่งขันในนาม ACT',
      deleteProjectPrompt: 'ลบโปรเจกต์นี้หรือไม่? การดำเนินการนี้ย้อนกลับไม่ได้',
      deleteCompetitionPrompt: 'ลบประวัติการแข่งขันนี้หรือไม่? การดำเนินการนี้ย้อนกลับไม่ได้',
      pageLabel: (current, total) => `หน้า ${current} จาก ${total}`,
      itemsPerPage: 'รายการต่อหน้า',
    },
  },
} satisfies Record<Locale, AdminMessages>;

export function getAdminMessages(locale: Locale): AdminMessages {
  return adminMessages[locale];
}
