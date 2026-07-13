import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const TELEBIRR_NUMBER = '0902873635';
const SERVER_URL = 'https://ethiogame-server-production-6601.up.railway.app';

export default function DepositScreen({ onClose }) {
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [copied,    setCopied]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  // Phase 2 (crash/memory hardening): a phone camera screenshot can easily
  // be several MB. The old code read it as a base64 data URL, which inflates
  // size by ~33% and holds the whole thing as a plain string in React state
  // for as long as this screen is open — on a low-end device, that's a real
  // memory spike for a receipt upload. An object URL is just a lightweight
  // reference to the same Blob (no re-encoding, no size inflation), and we
  // explicitly revoke it below instead of leaving it for GC to get to
  // whenever it feels like it.
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleCopy = () => {
    navigator.clipboard.writeText(TELEBIRR_NUMBER).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      // ✅ FIX #3 — Send the HMAC-signed initData string, NOT initDataUnsafe.
      //
      // initDataUnsafe is a plain JS object Telegram already parsed for
      // convenience — it has no signature and can be freely tampered with
      // in DevTools. Anyone could change the id field to any telegramId
      // and submit a deposit on behalf of another user.
      //
      // initData is the raw URL-encoded string that Telegram signs with
      // HMAC-SHA256 using your bot token. The server verifies this
      // signature and extracts telegramId only from the verified payload.
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        setError('Could not read Telegram session. Please reopen the app.');
        setLoading(false);
        return;
      }

      // Send as FormData — no Content-Type header needed (browser adds boundary)
      const formData = new FormData();
      formData.append('photo',    file);
      formData.append('initData', initData); // signed — server verifies this

      const res = await fetch(`${SERVER_URL}/deposit/upload`, {
        method: 'POST',
        body:   formData,
        // ✅ No Content-Type header — browser sets it automatically with boundary
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#181C27] p-6 flex flex-col items-center gap-5 text-center rounded-t-2xl min-h-[40vh] justify-center">
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:300 }}
          className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-3xl">
          ✓
        </motion.div>
        <div>
          <h3 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Receipt Submitted!</h3>
          <p className="text-sm text-gray-400 mt-1">Our admin will verify and credit your balance shortly.</p>
        </div>
        <motion.button whileTap={{ scale:0.94 }} onClick={onClose}
          className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
          style={{fontFamily:'Syne,sans-serif'}}>
          Done
        </motion.button>
      </div>
    );
  }

  return (
    <div className="bg-[#181C27] rounded-t-2xl p-5 flex flex-col gap-5">
      <div className="w-10 h-1 rounded-full bg-[#2A2F45] mx-auto -mt-1" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Deposit via Telebirr</h2>
        <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-lg bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center text-gray-500">✕
        </motion.button>
      </div>

      <div className="flex flex-col gap-3">
        {[
          'Send to this Telebirr number',
          'Take a screenshot of the receipt',
          'Upload the screenshot below',
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
            <p className="text-sm text-gray-300">{s}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1E2235] border border-[#F5A623]/30 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Telebirr Number</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-[#F5A623]">{TELEBIRR_NUMBER}</p>
        </div>
        <motion.button whileTap={{ scale:0.88 }} onClick={handleCopy}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30'}`}
          style={{fontFamily:'Syne,sans-serif'}}>
          {copied ? '✓ Copied' : 'Copy'}
        </motion.button>
      </div>

      <input ref={fileRef} type="file" accept="image/*"
        className="hidden" onChange={handleFile} />

      <motion.button whileTap={{ scale:0.97 }} onClick={() => fileRef.current?.click()}
        className={`w-full py-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${preview ? 'border-[#F5A623]/60 bg-[#F5A623]/5' : 'border-[#2A2F45] bg-[#1E2235]'}`}>
        {preview ? (
          <img src={preview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl" />
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-[#2A2F45] flex items-center justify-center text-2xl text-gray-500">📷</div>
            <p className="text-sm text-gray-400">Tap to upload Telebirr screenshot</p>
            <p className="text-xs text-gray-600">JPG, PNG accepted</p>
          </>
        )}
      </motion.button>

      {file && <p className="text-xs text-center text-gray-500 -mt-2 truncate">{file.name}</p>}

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-400/90 leading-relaxed">
          ⚠️ After submitting, an admin manually reviews your receipt. Balance is credited within <strong>15 minutes</strong> during business hours.
        </p>
      </div>

      <motion.button whileTap={{ scale:0.96 }} onClick={handleSubmit}
        disabled={!file || loading}
        className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,166,35,0.35)]"
        style={{ background: file ? '#F5A623' : undefined, backgroundColor: !file ? '#1E2235' : undefined, color: file ? '#0F1117' : '#4B5563', fontFamily:'Syne,sans-serif' }}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.8, ease:'linear' }}
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            Submitting…
          </span>
        ) : 'Submit Receipt'}
      </motion.button>
    </div>
  );
}
