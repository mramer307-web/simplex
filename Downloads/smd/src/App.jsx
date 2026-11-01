import React, { useState, useEffect } from 'react';

const departments = [
  { title: 'Programming', desc: 'بناء وتطوير المواقع وتطبيقات الويب والموبايل باستخدام أحدث التقنيات مثل Next.js و React.', reqs: 'خبرة بلغة برمجة واحدة على الأقل، معرفة بـ Git.' },
  { title: 'Cybersecurity', desc: 'حماية البنية التحتية للمشاريع، فحص الثغرات، واختبار الاختراق ضمن بيئة قانونية ومسؤولة.', reqs: 'أساسيات الشبكات، فهم OWASP Top 10.' },
  { title: 'Academic', desc: 'إعداد المحتوى التقني، الأبحاث، وشرح المواضيع البرمجية والهندسية المعقدة بأسلوب مبسط.', reqs: 'مهارات بحث عالية، قدرة ممتازة على تبسيط المعلومة.' },
  { title: 'Social Media', desc: 'إدارة منصات التواصل الاجتماعي، صياغة خطط المحتوى، وإبراز هوية التيم بصرياً.', reqs: 'إبداع في صناعة المحتوى، حس فني وتسويقي.' },
  { title: 'HR', desc: 'إدارة شؤون الأعضاء، تقييم الأداء، تنظيم المقابلات الشخصية، وخلق بيئة عمل إيجابية.', reqs: 'مهارات تواصل قوية، ذكاء عاطفي وتنظيم.' },
  { title: 'Public Relations', desc: 'بناء الشراكات الخارجية، كتابة الخطابات الرسمية، ومقترحات التعاون.', reqs: 'لباقة في الحديث، مهارات تفاوض وكتابة.' },
  { title: 'Organization', desc: 'التخطيط اللوجستي والتنظيمي للورش، المؤتمرات، والفعاليات الكبرى التي يقيمها التيم.', reqs: 'قدرة عالية على إدارة الوقت وحل المشكلات تحت الضغط.' },
];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'حصلت مشكلة أثناء الاتصال بالخادم.');
  return result;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [formError, setFormError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [stats, setStats] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({ company: '', email: '', level: 'bronze' });
  const [sponsorMessage, setSponsorMessage] = useState('');

  // حالة نموذج التقديم الذكي
  const [appForm, setAppForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: '',
    level: 'المستوى الثالث',
    department: 'Programming',
    track: 'experienced', // beginner or experienced
    skills: '',
    cvFile: null,
    portfolioUrl: '',
    // أسئلة تخصصية
    specialAnswer: '',
    codeTest: ''
  });
  const [submittedCode, setSubmittedCode] = useState(null);

  // حالات لوحة التحكم
  const [adminTab, setAdminTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const loadAdminData = async () => {
    const [applicationData, sponsorData] = await Promise.all([
      apiRequest('/api/admin/applications'),
      apiRequest('/api/admin/sponsors'),
    ]);
    setApplications(applicationData);
    setSponsors(sponsorData);
  };

  useEffect(() => {
    let active = true;
    apiRequest('/api/stats')
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((error) => {
        if (active) setStatsError(error.message);
      });
    apiRequest('/api/admin/session')
      .then(async ({ authenticated }) => {
        if (!active || !authenticated) return;
        await loadAdminData();
        if (active) setIsAdminLoggedIn(true);
      })
      .catch((error) => {
        if (active) setAdminError(error.message);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refreshStats = async () => {
      try {
        setStats(await apiRequest('/api/stats'));
        setStatsError('');
      } catch (error) {
        setStatsError(error.message);
      }
    };
    const interval = window.setInterval(refreshStats, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAdminLoggedIn) return undefined;
    const refreshAdminData = async () => {
      try {
        await loadAdminData();
        setAdminError('');
      } catch (error) {
        setAdminError(error.message);
      }
    };
    const interval = window.setInterval(refreshAdminData, 10000);
    return () => window.clearInterval(interval);
  }, [isAdminLoggedIn]);

  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

    targets.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 90}ms`);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [activeTab, adminTab, isAdminLoggedIn, submittedCode]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      await loadAdminData();
      setIsAdminLoggedIn(true);
      setActiveTab('admin');
      setAdminUsername('');
      setAdminPassword('');
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    setAdminError('');
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' });
      setIsAdminLoggedIn(false);
      setActiveTab('home');
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const application = await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify(appForm),
      });
      setSubmittedCode(application.id);
      setStats((current) => current && ({ ...current, applications: current.applications + 1 }));
      if (isAdminLoggedIn) setApplications((current) => [application, ...current]);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSponsorSubmit = async (e) => {
    e.preventDefault();
    setSponsorMessage('');
    setFormError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/api/sponsors', {
        method: 'POST',
        body: JSON.stringify(sponsorForm),
      });
      setStats((current) => current && ({ ...current, sponsors: current.sponsors + 1 }));
      setSponsorMessage('وصل طلب الرعاية بنجاح، وسنتواصل معكم قريباً.');
      setSponsorForm({ company: '', email: '', level: 'bronze' });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans bg-slate-50 text-slate-900 direction-rtl`} dir="rtl">
      {/* شريط التنقل العلوي - Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-sky-500/20">
              SX
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">
                SIMPLEX
              </span>
              <span className="block text-xs font-semibold text-slate-500 tracking-wider">التيم التقني الاحترافي</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'home' ? 'bg-sky-50 text-sky-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>الرئيسية</button>
            <button onClick={() => setActiveTab('about')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'about' ? 'bg-sky-50 text-sky-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>من نحن</button>
            <button onClick={() => setActiveTab('departments')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'departments' ? 'bg-sky-50 text-sky-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>الأقسام</button>
            <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'projects' ? 'bg-sky-50 text-sky-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>المشاريع والفعاليات</button>
            <button onClick={() => setActiveTab('donate')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'donate' ? 'bg-sky-50 text-sky-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>الدعم والرعاية</button>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('apply')} className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 text-sm">
              انضم إلينا Join Us
            </button>
            <button onClick={() => setActiveTab('admin-login')} className="border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-600 p-2.5 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* محتوى الصفحات */}
      <main className="animate-fadeIn">
        {/* 1. الصفحة الرئيسية */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section data-reveal className="relative overflow-hidden py-24 lg:py-32 bg-gradient-to-b from-white via-sky-50/50 to-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-700 text-xs font-bold mb-6 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  بوابتك نحو الابتكار التقني والهندسي المستقبلي
                </div>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-8">
                  نحن فريق <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">SIMPLEX</span> التقني
                </h1>
                <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 leading-relaxed mb-10">
                  مجمع هندسي وبرمجي متكامل يجمع نخبة العقول المبدعة لتنفيذ مشاريع حقيقية، أبحاث متقدمة، وحلول أمنية ورقمية مبتكرة بأعلى معايير الجودة العالمية.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={() => setActiveTab('apply')} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-sky-500/30 hover:shadow-sky-500/50 transition-all transform hover:-translate-y-1">
                    قدم طلب انضمام الآن
                  </button>
                  <button onClick={() => setActiveTab('departments')} className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:border-sky-300 font-bold px-8 py-4 rounded-xl shadow-sm transition-all">
                    استكشف الأقسام والتخصصات
                  </button>
                </div>
              </div>
            </section>

            {/* Vision & Mission */}
            <section data-reveal className="py-20 bg-white border-y border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-sky-50/60 to-white border border-sky-100 shadow-sm">
                    <div className="w-12 h-12 bg-sky-600 text-white rounded-xl flex items-center justify-center font-bold text-xl mb-6 shadow-md">🎯</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">رؤيتنا (Our Vision)</h3>
                    <p className="text-slate-600 leading-relaxed">
                      أن نكون التيم الطلابي والمهني الأبرز إقليمياً في تقديم حلول هندسية وبرمجية وسيبرانية مبتكرة تسهم في بناء جيل قادر على قيادة التحول الرقمي بثقة واقتدار.
                    </p>
                  </div>
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white border border-blue-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl mb-6 shadow-md">🚀</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">رسالتنا (Our Mission)</h3>
                    <p className="text-slate-600 leading-relaxed">
                      تمكين الشباب والشغوفين بالتكنولوجيا عبر بيئة عمل حقيقية (Agile Environment) تجمع بين التدريب العملي المتقدم، الورش المتخصصة، وتنفيذ مشاريع ريادية تخدم المجتمع التقني.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Statistics & Achievements */}
            <section data-reveal className="py-20 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl font-black text-slate-900 mb-4">إحصائيات الموقع</h2>
                <p className="text-slate-600 max-w-2xl mx-auto mb-16">إحصائيات مباشرة من الطلبات المحفوظة في الموقع</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-4xl sm:text-5xl font-black text-sky-600 mb-2">{stats ? stats.applications : '—'}</div>
                    <div className="text-slate-600 font-medium">طلبات الانضمام المستلمة</div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-4xl sm:text-5xl font-black text-blue-600 mb-2">{stats ? stats.sponsors : '—'}</div>
                    <div className="text-slate-600 font-medium">طلبات الرعاية المستلمة</div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-4xl sm:text-5xl font-black text-sky-600 mb-2">{departments.length}</div>
                    <div className="text-slate-600 font-medium">أقسام متاحة للتقديم</div>
                  </div>
                </div>
                {statsError && <p role="alert" className="mt-6 text-red-600 text-sm">{statsError}</p>}
              </div>
            </section>
          </div>
        )}

        {/* 2. صفحة من نحن (About Us) */}
        {activeTab === 'about' && (
          <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">من نحن - SIMPLEX</h2>
              <p className="text-slate-600 text-lg">قصة طموح هندسي تحولت إلى كيان تقني متكامل يجمع أفضل المواهب</p>
            </div>

            <div className="space-y-12">
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  قصة تأسيس التيم
                </h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  تأسس تيم <strong>SIMPLEX</strong> برؤية واضحة لجسر الهوة بين التعليم الأكاديمي النظري ومتطلبات سوق العمل التقني الفعلية. بدأ الفريق بمجموعة صغيرة من طلاب الهندسة وعلوم الحاسب، وتطور ليصبح مظلة واسعة تضم أقساماً برمجية وسيبرانية وإدارية متكاملة تعمل بروح الفريق الواحد وفق منهجيات الإدارة الرشيقة (Agile).
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 text-sky-600">الابتكار المستمر</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">نشجع دائماً تجربة التقنيات الحديثة وإيجاد حلول برمجية مبتكرة للمشكلات المعقدة.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 text-blue-600">العمل الجماعي</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">نؤمن أن الإنجازات العظيمة تبنى بتكامل الأقسام وتناغم الجهود بين جميع الأعضاء.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 text-sky-600">الجودة العالية</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">نلتزم بأعلى معايير الجودة والأمان في كتابة الكود البرمجي وإدارة المشاريع.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. الأقسام (Departments) */}
        {activeTab === 'departments' && (
          <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">أقسام تيم SIMPLEX</h2>
              <p className="text-slate-600 text-lg">{departments.length} أقسام متخصصة تتكامل لإنجاح المشاريع والفعاليات التقنية</p>
            </div>

            <div data-reveal className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {departments.map((dept, idx) => (
                <div data-reveal key={dept.title} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold text-lg mb-6">
                      {dept.title.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{dept.title}</h3>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">{dept.desc}</p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 mb-6">
                      <strong>المتطلبات:</strong> {dept.reqs}
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('apply')} className="w-full bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-600 font-semibold py-2.5 rounded-xl transition-all text-sm">
                    التقديم لهذا القسم
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. المشاريع والفعاليات (Projects & Activities) */}
        {activeTab === 'projects' && (
          <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">مشاريع وفعاليات SIMPLEX</h2>
              <p className="text-slate-600 text-lg">نبذة عن أبرز الورش، المشاريع البرمجية، والفعاليات التي قدمها التيم</p>
            </div>

            <div data-reveal className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: 'منصة إدارة الأصول الذكية', cat: 'مشروع تيم', desc: 'نظام سحابي متكامل لإدارة ومتابعة أجهزة المعامل بكفاءة عالية.', img: '💻' },
                { title: 'ورشة الأمن السيبراني التطبيقي', cat: 'ورشة تدريبية', desc: 'تدريب عملي على اكتشاف الثغرات وحماية الويب وتأمين قواعد البيانات.', img: '🔒' },
                { title: 'هاكاثون SIMPLEX البرمجي', cat: 'فعالية كبرى', desc: 'تحدٍ برمجي يجمع المواهب للتعاون على ابتكار حلول تقنية.', img: '🚀' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="h-48 bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-6xl text-white">
                    {item.img}
                  </div>
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 rounded-full bg-sky-50 text-sky-600 text-xs font-bold mb-3">{item.cat}</span>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. التبرع والرعاية (Donations & Sponsorships) */}
        {activeTab === 'donate' && (
          <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">ادعم تيم SIMPLEX</h2>
              <p className="text-slate-600 text-lg">ساهم معنا في تطوير المشاريع الطلابية ودعم الورش والفعاليات التقنية</p>
            </div>

            <div data-reveal className="grid md:grid-cols-2 gap-12">
              {/* تبرع فردي */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">تبرع فردي (Donate)</h3>
                <p className="text-slate-600 text-sm mb-6">ساهم بأي مبلغ لدعم استمرارية الورش والمعدات المعملية للتيم.</p>
                <div className="space-y-4">
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    التبرع الإلكتروني غير متاح حالياً، وهذا الموقع لا يستقبل أو يخصم أي مبالغ.
                  </p>
                </div>
              </div>

              {/* كن راعياً (Become a Sponsor) */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">كن راعياً للمستقبل (Become a Sponsor)</h3>
                <p className="text-slate-600 text-sm mb-6">للشركات والمؤسسات الراغبة في شراكة استراتيجية ورعاية فعالياتنا الكبرى.</p>
                <form onSubmit={handleSponsorSubmit} className="space-y-4">
                  <input type="text" value={sponsorForm.company} onChange={(e) => setSponsorForm({ ...sponsorForm, company: e.target.value })} placeholder="اسم الشركة أو المؤسسة" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                  <input type="email" value={sponsorForm.email} onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })} placeholder="البريد الإلكتروني الرسمي" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                  <select value={sponsorForm.level} onChange={(e) => setSponsorForm({ ...sponsorForm, level: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white">
                    <option value="bronze">Bronze Sponsor (دعم الفعاليات والأنشطة)</option>
                    <option value="silver">Silver Sponsor (دعم المشاريع والورش التقنية)</option>
                    <option value="gold">Gold Sponsor (شراكة ودعم استراتيجي للتيم)</option>
                  </select>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                    {isSubmitting ? 'جارٍ إرسال الطلب...' : 'إرسال طلب رعاية'}
                  </button>
                  {sponsorMessage && <p role="status" className="text-emerald-700 text-sm">{sponsorMessage}</p>}
                  {formError && activeTab === 'donate' && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 6. نموذج التقديم الذكي (Join Us) */}
        {activeTab === 'apply' && (
          <div data-reveal className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-slate-900 mb-2">طلب انضمام إلى تيم SIMPLEX</h2>
                <p className="text-slate-600 text-sm">املأ النموذج أدناه لتنضم إلى مجتمعنا التقني الاحترافي</p>
              </div>

              {submittedCode ? (
                <div className="text-center py-12 bg-sky-50 rounded-2xl border border-sky-200">
                  <div className="w-16 h-16 bg-sky-600 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-md">✓</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">تم إرسال طلبك بنجاح!</h3>
                  <p className="text-slate-600 mb-6">كود تتبع طلبك هو: <strong className="text-sky-600 font-mono text-lg">{submittedCode}</strong></p>
                  <button onClick={() => setSubmittedCode(null)} className="bg-sky-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md">تقديم طلب آخر</button>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل *</label>
                      <input type="text" required value={appForm.fullName} onChange={e => setAppForm({...appForm, fullName: e.target.value})} placeholder="أدخل اسمك الثلاثي" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني *</label>
                      <input type="email" required value={appForm.email} onChange={e => setAppForm({...appForm, email: e.target.value})} placeholder="name@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">رقم الهاتف (WhatsApp) *</label>
                      <input type="tel" required value={appForm.phone} onChange={e => setAppForm({...appForm, phone: e.target.value})} placeholder="010XXXXXXXX" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">القسم المراد الانضمام إليه *</label>
                      <select value={appForm.department} onChange={e => setAppForm({...appForm, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white">
                        {departments.map(({ title }) => <option key={title} value={title}>{title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">المسار المفضل *</label>
                      <select value={appForm.track} onChange={e => setAppForm({...appForm, track: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white">
                        <option value="beginner">مسار المبتدئين (تحت التدريب والإشراف)</option>
                        <option value="experienced">مسار أصحاب الخبرة (جاهز للمشاريع الفعلية)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">رابط Portfolio أو GitHub أو LinkedIn *</label>
                      <input type="url" required value={appForm.portfolioUrl} onChange={e => setAppForm({...appForm, portfolioUrl: e.target.value})} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm" />
                    </div>
                  </div>

                  {/* أسئلة تخصصية بحسب القسم */}
                  <div className="p-6 rounded-2xl bg-sky-50/50 border border-sky-100">
                    <h4 className="font-bold text-slate-900 mb-2">أسئلة تخصصية خاصة بقسم ({appForm.department})</h4>
                    <p className="text-xs text-slate-500 mb-4">يرجى الإجابة بدقة لتحديد مستواك ومناسبتك للمهمة</p>
                    {appForm.department === 'Programming' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">ما هي لغات البرمجة التي تتقنها وما أبرز مشروع قمت بتنفيذه؟</label>
                        <textarea rows="3" value={appForm.specialAnswer} onChange={e => setAppForm({...appForm, specialAnswer: e.target.value})} placeholder="اكتب تفاصيل مشاريعك البرمجية السابقة..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white"></textarea>
                      </div>
                    )}
                    {appForm.department === 'Cybersecurity' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">ما هو مجالك المفضل في الأمن السيبراني وما الأدوات التي تستخدمها؟</label>
                        <textarea rows="3" value={appForm.specialAnswer} onChange={e => setAppForm({...appForm, specialAnswer: e.target.value})} placeholder="مثل Web Pentesting, Burp Suite, Nmap..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white"></textarea>
                      </div>
                    )}
                    {appForm.department !== 'Programming' && appForm.department !== 'Cybersecurity' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">اشرح بإيجاز خبرتك السابقة في هذا المجال ولماذا تريد الانضمام لنا؟</label>
                        <textarea rows="3" value={appForm.specialAnswer} onChange={e => setAppForm({...appForm, specialAnswer: e.target.value})} placeholder="اكتب نبذة عن مهاراتك..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-sm bg-white"></textarea>
                      </div>
                    )}
                  </div>

                  {formError && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-500/25 transition-all text-base">
                    {isSubmitting ? 'جارٍ إرسال الطلب...' : 'إرسال طلب الانضمام إلى SIMPLEX'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 7. تسجيل دخول الإدارة (Admin Login) */}
        {activeTab === 'admin-login' && !isAdminLoggedIn && (
          <div data-reveal className="py-24 max-w-md mx-auto px-4">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-md">🔐</div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">لوحة تحكم الإدارة</h2>
              <p className="text-slate-500 text-sm mb-6">منطقة محظورة للأعضاء المخولين فقط</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input type="text" autoComplete="username" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="اسم المستخدم" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-center text-lg" />
                <input type="password" autoComplete="current-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="كلمة المرور" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 text-center text-lg tracking-widest" />
                {adminError && <p role="alert" className="text-red-600 text-sm">{adminError}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                  {isSubmitting ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 8. لوحة تحكم الإدارة الكاملة (Admin Dashboard) */}
        {activeTab === 'admin' && isAdminLoggedIn && (
          <div data-reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-3xl font-black text-slate-900">لوحة تحكم الإدارة - SIMPLEX</h1>
                <p className="text-slate-500 text-sm">إدارة الطلبات، المتقدمين، والرعايات والصلاحيات</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAdminTab('dashboard')} className={`px-4 py-2 rounded-xl text-sm font-bold ${adminTab === 'dashboard' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>الإحصائيات</button>
                <button onClick={() => setAdminTab('apps')} className={`px-4 py-2 rounded-xl text-sm font-bold ${adminTab === 'apps' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>الطلبات ({applications.length})</button>
                <button onClick={() => setAdminTab('sponsors')} className={`px-4 py-2 rounded-xl text-sm font-bold ${adminTab === 'sponsors' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>الرعاة والتبرعات</button>
                <button onClick={handleAdminLogout} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold">خروج</button>
              </div>
            </div>
            {adminError && <p role="alert" className="text-red-600 text-sm mb-4">{adminError}</p>}

            {adminTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-sky-600 mb-1">{applications.length}</div>
                    <div className="text-slate-500 text-sm font-medium">إجمالي طلبات التقديم</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-blue-600 mb-1">{departments.length}</div>
                    <div className="text-slate-500 text-sm font-medium">الأقسام المتاحة للتقديم</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-emerald-600 mb-1">{sponsors.length}</div>
                    <div className="text-slate-500 text-sm font-medium">طلبات الرعاية المستلمة</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-3xl font-black text-amber-600 mb-1">{applications.filter((app) => app.status === 'Pending').length}</div>
                    <div className="text-slate-500 text-sm font-medium">طلبات الانضمام قيد المراجعة</div>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'apps' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 font-bold text-slate-900">طلبات الانتساب الجديدة</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                        <th className="p-4">كود الطلب</th>
                        <th className="p-4">اسم المتقدم</th>
                        <th className="p-4">القسم</th>
                        <th className="p-4">البريد الإلكتروني</th>
                        <th className="p-4">التاريخ</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {applications.map((app, idx) => (
                        <tr key={app.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono font-bold text-sky-600">{app.id}</td>
                          <td className="p-4 font-semibold text-slate-900">{app.name}</td>
                          <td className="p-4 text-slate-600">{app.dept}</td>
                          <td className="p-4 text-slate-500">{app.email}</td>
                          <td className="p-4 text-slate-500">{new Date(app.date).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              app.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                              app.status === 'Under Review' ? 'bg-amber-50 text-amber-600' :
                              app.status === 'Interview' ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <button onClick={() => setSelectedApplication(app)} className="text-sky-600 hover:underline font-semibold text-xs">عرض الطلب</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedApplication && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onClick={() => setSelectedApplication(null)}>
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="application-details-title"
                  className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <h2 id="application-details-title" className="text-xl font-black text-slate-900">{selectedApplication.name}</h2>
                      <p className="font-mono text-sm text-sky-600">{selectedApplication.id}</p>
                    </div>
                    <button onClick={() => setSelectedApplication(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">إغلاق</button>
                  </div>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="font-bold text-slate-500">البريد الإلكتروني</dt><dd className="mt-1 break-all">{selectedApplication.email}</dd></div>
                    <div><dt className="font-bold text-slate-500">رقم الهاتف</dt><dd className="mt-1" dir="ltr">{selectedApplication.phone}</dd></div>
                    <div><dt className="font-bold text-slate-500">القسم</dt><dd className="mt-1">{selectedApplication.dept}</dd></div>
                    <div><dt className="font-bold text-slate-500">المسار</dt><dd className="mt-1">{selectedApplication.track === 'beginner' ? 'مبتدئ' : 'ذو خبرة'}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-bold text-slate-500">رابط الأعمال</dt><dd className="mt-1"><a href={selectedApplication.portfolioUrl} target="_blank" rel="noreferrer" className="break-all text-sky-600 underline">{selectedApplication.portfolioUrl}</a></dd></div>
                    <div className="sm:col-span-2"><dt className="font-bold text-slate-500">الإجابة التخصصية</dt><dd className="mt-1 whitespace-pre-wrap">{selectedApplication.specialAnswer || 'لم تُضف إجابة.'}</dd></div>
                  </dl>
                </section>
              </div>
            )}

            {adminTab === 'sponsors' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 font-bold text-slate-900">سجل الرعاة والشركات الداعمة</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
                        <th className="p-4">اسم الشركة</th>
                        <th className="p-4">مستوى الرعاية</th>
                        <th className="p-4">البريد الإلكتروني</th>
                        <th className="p-4">التاريخ</th>
                        <th className="p-4">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {sponsors.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-900">{s.company}</td>
                          <td className="p-4"><span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-full text-xs">{s.level}</span></td>
                          <td className="p-4 text-slate-600">{s.email}</td>
                          <td className="p-4 text-slate-500">{new Date(s.date).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4"><span className="px-3 py-1 bg-amber-50 text-amber-600 font-bold rounded-full text-xs">{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">SIMPLEX</span>
            <p className="text-slate-400 text-sm mt-1">جميع الحقوق محفوظة © {new Date().getFullYear()} - تم تصميم وبرمجة هذا النظام بواسطة فريق SIMPLEX الاحترافي.</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">الرئيسية</button>
            <button onClick={() => setActiveTab('about')} className="hover:text-white transition-colors">من نحن</button>
            <button onClick={() => setActiveTab('departments')} className="hover:text-white transition-colors">الأقسام</button>
            <button onClick={() => setActiveTab('apply')} className="hover:text-white transition-colors">انضم إلينا</button>
          </div>
        </div>
      </footer>
    </div>
  );
}