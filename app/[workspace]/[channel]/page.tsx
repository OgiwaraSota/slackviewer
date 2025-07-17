"use client";


import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function ChannelsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = decodeURIComponent(params.workspace as string);
  const defaultChannel = decodeURIComponent(params.channel as string);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // チャンネル一覧取得
  useEffect(() => {
    if (workspace) {
      fetchChannels();
    }
  }, [workspace]);

  // デフォルトチャンネルが指定されていたら選択
  useEffect(() => {
    if (channels.length > 0 && defaultChannel) {
      const found = channels.find((c) => c.name === defaultChannel);
      if (found) {
        setSelectedChannel(found);
        fetchMessages(found.id);
      }
    }
  }, [channels, defaultChannel]);

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

  const fetchMessages = async (channelId: string, offset: number = 0) => {
    if (!selectedChannel) return; // selectedChannelがnullの場合は何もしない

    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(
        `https://my-java23-app-1053002991087.asia-northeast1.run.app/messages/workspace/${workspace}?channel=${selectedChannel.name}`
      );
      if (!res.ok) throw new Error("メッセージの取得に失敗しました");

      const data = await res.json();
      setMessages((prevMessages) => [...data.results, ...prevMessages]);
    } catch (error) {
      console.error(error);
      setError("メッセージの取得に失敗しました");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const bottom = e.currentTarget.scrollTop === 0;
    if (bottom && !loadingMessages && selectedChannel) {
      fetchMessages(selectedChannel.id, messages.length); // 次の20件を読み込む
    }
  };

  const handleThreadClick = (threadTs: string, channel: string) => {
    if (selectedChannel) {
      router.push(`/${workspace}/${channel}/${threadTs}`);
    }
  };

  const sortedChannels = useMemo(() => {
    // チャンネル名の先頭に数字があるものを抽出
    const numericChannels = channels.filter((c) => /^\d+/.test(c.name));
    const nonNumericChannels = channels.filter((c) => !/^\d+/.test(c.name));

    numericChannels.sort((a, b) => {
      const aMatch = a.name.match(/^\d+/);
      const bMatch = b.name.match(/^\d+/);
      const aNum = aMatch ? parseInt(aMatch[0], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[0], 10) : 0;
      return aNum - bNum;
    });

    return [...numericChannels, ...nonNumericChannels];
  }, [channels]);

  const visibleMessages = useMemo(() => {
    return messages
      .filter((msg) => msg.thread_ts === null || msg.thread_ts === msg.ts)
      .sort((a, b) => Number(a.ts.split(".")[0]) - Number(b.ts.split(".")[0]));
  }, [messages]);

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
              className={`p-2 hover:bg-gray-200 cursor-pointer rounded ${
                selectedChannel?.id === channel.id ? "bg-blue-100 font-semibold" : ""
              }`}
              onClick={() => router.push(`/${workspace}/${channel.name}`)}
            >
              #{channel.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* メインエリア */}
      <main className="w-3/4 p-4 overflow-y-auto flex flex-col">

        {selectedChannel ? (
          <>
            <h2 className="text-xl font-bold mb-4">#{selectedChannel.name} のメッセージ</h2>
            {loadingMessages ? (
              <p>読み込み中...</p>
            ) : (
              <div
                className="space-y-4 flex-grow overflow-y-auto"
                onScroll={handleScroll}
              >
                {visibleMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white shadow-sm rounded-lg p-3 border border-gray-200">
                    <p className="font-medium text-sm text-gray-600 mb-1">
                      <span className="font-bold text-lg">{msg.username || "(名無し)"}</span>
                      <span className="ml-2 text-gray-500">
                        {new Date(Number(msg.ts.split(".")[0]) * 1000).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-sm">{msg.text}</p>
                    {msg.thread_ts && (
                      <button
                        className="text-blue-500 hover:underline text-sm mt-2"
                        onClick={() => handleThreadClick(msg.thread_ts!, selectedChannel.name)}
                      >
                        💬 スレッドを表示
                      </button>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </>
        ) : (
          <p>チャンネルを選択してください。</p>
        )}
      </main>

      {/* 固定ボタン */}
      <div className="fixed bottom-8 right-8 space-y-6">
        <button
          className="bg-gradient-to-r from-green-600 to-green-400 text-white p-6 rounded-full shadow-lg hover:scale-105 transform transition duration-300 ease-in-out hover:from-green-500 hover:to-green-300 focus:outline-none focus:ring-4 focus:ring-blue-300 font-semibold"
          onClick={() => router.push(`search`)}
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
