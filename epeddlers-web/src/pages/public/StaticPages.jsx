export function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-darkgreen">About ePeddlers</h1>
      <p className="mt-4 text-gray-600">
        ePeddlers is the digital permit system of the City Government of La Carlota for peddler
        business permits. It streamlines application, inspection, sanitary review, treasury
        verification, and permit issuance while keeping peddler records organized and auditable.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-darkgreen">Purpose</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
        <li>Digitize permit applications and reduce paperwork.</li>
        <li>Maintain an organized, searchable peddler registry.</li>
        <li>Improve verification across departments.</li>
        <li>Support treasury accountability and transparent collections.</li>
        <li>Prepare for future vendor mapping integration.</li>
      </ul>
    </div>
  )
}

export function HowItWorks() {
  const steps = [
    'Choose New Application or Renewal.',
    'Complete the application form.',
    'Upload required documents.',
    'Submit and receive your Application ID.',
    'Track your application status online.',
    'Complete inspection and sanitary requirements.',
    'Complete payment and treasury verification.',
    'Wait for final permit approval.',
    'View or print your permit when officially issued.',
  ]
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-darkgreen">How It Works</h1>
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {i + 1}
            </span>
            <p className="pt-0.5 text-gray-700">{s}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-gray-500">
        Processing steps may vary according to the city's approved requirements.
      </p>
    </div>
  )
}

export function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-darkgreen">Contact & Help</h1>
      <p className="mt-4 text-gray-600">
        For assistance with your peddler permit application, please visit the City Government
        of La Carlota or contact the office handling business permits during office hours.
      </p>
      <div className="card mt-6 p-6 text-sm text-gray-600">
        <p className="font-medium text-darkgreen">City Government of La Carlota</p>
        <p className="mt-1">Negros Occidental, Philippines</p>
        <p className="mt-3 text-xs text-gray-400">
          Contact details are administrator-configurable and shown here as placeholders.
        </p>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-5xl font-bold text-darkgreen">404</h1>
      <p className="mt-2 text-gray-600">The page you're looking for doesn't exist.</p>
    </div>
  )
}
