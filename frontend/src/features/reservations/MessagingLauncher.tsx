interface MessagingLauncherProps {
  //whatsAppNumber?: string;
  fbUrl?: string;
  //viberNumber?: string;
  //messageText?: string;
}

export default function MessagingLauncher({
  //whatsAppNumber,
  fbUrl,
  //viberNumber,
  //messageText = "Hello! I am inquiring about ParkFlow services.",
}: MessagingLauncherProps) {
  // URL Generators
  /*
  const getWhatsAppUrl = () => {
    const encodedText = encodeURIComponent(messageText);
    return `https://wa.me/${whatsAppNumber}?text=${encodedText}`;
  };
  */

  const getMessengerUrl = () => {
    const splittedUrl = fbUrl?.split("/").filter((item) => !!item) ?? [];
    console.log(splittedUrl);
    return splittedUrl?.length > 0
      ? `https://m.me/${splittedUrl[splittedUrl.length - 1]}`
      : undefined;
  };

  /*
  const getViberUrl = () => {
    // Viber uses standard URI scheme
    return `viber://chat?number=%2B${viberNumber}`;
  };
  */

  return (
    <div className="flex items-center sm:flex-row gap-4 pt-1 pb-1 ">
      {/* FB Messenger Link */}
      {getMessengerUrl() && (
        <a
          href={getMessengerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
        >
          Chat on Messenger
        </a>
      )}

      {/* WhatsApp Link */}
      {/* 
      {whatsAppNumber && (
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
        >
          Chat on WhatsApp
        </a>
      )}
      */}

      {/* Viber Link */}
      {/* 
      {viberNumber && (
        <a
          href={getViberUrl()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center"
        >
          Chat on Viber
        </a>
      )}
      */}
    </div>
  );
}
