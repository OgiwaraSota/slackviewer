"use client"; // クライアントサイドで実行されることを明示する

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// そのまま残すインターフェース定義やその他のコード
interface Channel {
  id: string;
  workspace: string;
  name: string;
}

interface Message {
  workspace: string;
  channel: string;
  username: string | null;
  text: string;
  ts: string;
  thread_ts: string | null;
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();

  const workspace = decodeURIComponent(params.workspace as string);
  const channel = decodeURIComponent(params.channel as string);
  const thread_ts = decodeURIComponent(params.thread_ts as string);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchChannels();
    fetchThreadMessages();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`https://my-java23-app-1053002991087.asia-northeast1.run.app/channels/workspace/${workspace}`);
      if (!res.ok) throw new Error("チャンネルの取得に失敗しました");
      const data = await res.json();
      setChannels(data.results);
    } catch (error) {
      console.error(error);
      setError("チャンネルの取得に失敗しました");
    }
  };

  const fetchThreadMessages = async () => {
    try {
      const res = await fetch(`https://my-java23-app-1053002991087.asia-northeast1.run.app/messages/workspace/${workspace}?thread_ts=${thread_ts}`);
      if (!res.ok) throw new Error("スレッドメッセージの取得に失敗しました");
      const data = await res.json();
      setMessages(data.results);
    } catch (error) {
      console.error(error);
      setError("スレッドメッセージの取得に失敗しました");
    }
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const aMatch = a.name.match(/^\d{3}/);
    const bMatch = b.name.match(/^\d{3}/);
    if (aMatch && bMatch) return parseInt(aMatch[0]) - parseInt(bMatch[0]);
    if (aMatch) return -1;
    if (bMatch) return 1;
    return 0;
  });

  return (
    <div className="flex h-screen font-sans">
      {/* サイドバー */}
      <aside className="w-1/4 border-r p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">チャンネル一覧</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <ul>
          {sortedChannels.map((channel) => (
            <li
              key={channel.id}
              className={`p-2 hover:bg-gray-200 cursor-pointer rounded`}
              onClick={() => router.push(`/${workspace}/${channel.name}`)}
            >
              #{channel.name}
            </li>
          ))}
        </ul>
      </aside>

      <main className="w-3/4 p-4 overflow-y-auto flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-blue-600">スレッド: #{channel}</h1>
          <button
            className="text-sm text-blue-500 underline mt-2"
            onClick={() => router.push(`/${workspace}/${channel}`)}
          >
            ← 元のメッセージに戻る
          </button>
        </div>

        {messages.length > 0 && (
          <>
            {/* 親メッセージ */}
            <div className="mb-6 p-5 rounded-xl border border-blue-300 bg-blue-50 shadow-md">
              <p className="font-medium text-gray-700 text-sm mb-2">
                <span className="text-xl font-bold text-blue-800">{messages[0].username || "(名無し)"}</span>
                <span className="ml-3 text-gray-500">
                  {new Date(Number(messages[0].ts.split(".")[0]) * 1000).toLocaleString()}
                </span>
              </p>
              <p className="text-gray-900 whitespace-pre-wrap text-base leading-relaxed">{messages[0].text}</p>
            </div>

            {/* スレッドの返信 */}
            <div className="space-y-4 flex-grow">
              {messages.slice(1).map((msg, idx) => (
                <div key={idx} className="bg-white shadow-sm rounded-lg p-3 border border-gray-200">
                  <p className="font-medium text-sm text-gray-600 mb-1">
                    <span className="font-bold text-lg">{msg.username || "(名無し)"}</span>
                    <span className="ml-2 text-gray-500">
                      {new Date(Number(msg.ts.split(".")[0]) * 1000).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              ))}
              <div/>
            </div>
          </>
        )}

        {/* データがまだ読み込まれていない場合の表示（お好みで） */}
        {messages.length === 0 && (
          <p className="text-gray-500 italic text-center mt-10">スレッドのメッセージが見つかりません。</p>
        )}
      </main>
      {/* 固定ボタン */}
      <div className="fixed bottom-8 right-8 space-y-6">
        <button
          className="bg-gradient-to-r from-green-600 to-green-400 text-white p-6 rounded-full shadow-lg hover:scale-105 transform transition duration-300 ease-in-out hover:from-green-500 hover:to-green-300 focus:outline-none focus:ring-4 focus:ring-blue-300 font-semibold"
          onClick={() => router.push(`/${workspace}/search`)}
        >
          SEARCH
        </button>
        <button
          className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-6 rounded-full shadow-lg hover:scale-105 transform transition duration-300 ease-in-out hover:from-blue-500 hover:to-blue-300 focus:outline-none focus:ring-4 focus:ring-green-300 font-semibold ml-2"
          onClick={() => router.push("/")}
        >
          HOME
        </button>
      </div>


    </div>
  );
}
