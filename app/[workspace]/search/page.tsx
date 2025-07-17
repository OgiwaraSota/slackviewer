"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SearchPage() {
  const params = useParams();
  const workspace = params.workspace as string;

  const [channels, setChannels] = useState<{ id: string; name: string; workspace: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; workspace: string }[]>([]);

  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [keyword, setKeyword] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!workspace) return;

    fetch(`https://my-java23-app-1053002991087.asia-northeast1.run.app/channels/workspace/${workspace}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.results
          .filter((ch: { id: string; name: string; workspace: string }) => ch.name !== "")
          .sort((a: { name: string }, b: { name: string }) => {
            const aNum = parseInt(a.name.slice(0, 3));
            const bNum = parseInt(b.name.slice(0, 3));
            return aNum - bNum;
          });
        setChannels(sorted);
      })
      .catch((err) => console.error("チャンネル取得失敗", err));

    fetch(`https://my-java23-app-1053002991087.asia-northeast1.run.app/users/workspace/${workspace}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.results
          .filter((u: { id: string; name: string; workspace: string }) => u.name !== "")
          .sort((a: { name: string }, b: { name: string }) => {
            const numA = parseInt(a.name);
            const numB = parseInt(b.name);
            const isNumA = !isNaN(numA);
            const isNumB = !isNaN(numB);

            if (isNumA && isNumB) {
              if (numA !== numB) return numA - numB;
              return a.name.localeCompare(b.name);
            }

            if (isNumA) return -1;
            if (isNumB) return 1;

            return 0;
          });
        setUsers(sorted);
      })
      .catch((err) => console.error("ユーザー取得失敗", err));
  }, [workspace]);

  const handleSearch = async () => {
    setIsLoading(true);
    setTotalCount(null); // 検索前にリセット
    try {
      const params = new URLSearchParams();
      if (selectedChannel) params.append("channel", selectedChannel);
      if (selectedUser) params.append("userid", selectedUser);
      if (keyword) params.append("word", keyword);
  
      const res = await fetch(
        `https://my-java23-app-1053002991087.asia-northeast1.run.app/messages/workspace/${workspace}?${params.toString()}`
      );
  
      if (res.status === 404) {
        setMessages([]);
        setTotalCount(0);
        return;
      }
  
      const data = await res.json();
      setMessages(data.results);
      setTotalCount(data.total_count); // ✅ 件数を保存
    } catch (err) {
      console.error("検索失敗", err);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen p-8 bg-white text-gray-800">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">メッセージ検索</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="">チャンネルを選択</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.name}>
              {ch.name}
            </option>
          ))}
        </select>

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border px-4 py-2 rounded"
        >
          <option value="">ユーザーを選択</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="キーワード"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border px-4 py-2 rounded w-64"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          検索
        </button>
      </div>

      {isLoading ? (
        <p>検索中...</p>
        ) : (
        <>
            {totalCount !== null && (
            <p className="text-gray-700 mb-4">{totalCount}件の結果が見つかりました。</p>
            )}
            {messages.length === 0 ? (
            <p className="text-gray-500">メッセージが見つかりませんでした。</p>
            ) : (
            <div className="space-y-4">
                {messages.map((msg, i) => (
                <div
                    key={i}
                    className="border p-4 rounded-lg shadow-sm bg-gray-50"
                >
                    <div className="text-sm text-gray-500">
                    [{msg.channel}] {msg.username} @ {msg.ts}
                    </div>
                    <div className="mt-2 text-gray-800 font-medium whitespace-pre-wrap">
                    {msg.text}
                    </div>
                    {msg.thread_ts && msg.thread_ts !== "null" && (
                    <button
                        onClick={() =>
                        router.push(`/slackviewer/${workspace}/${msg.channel}/${msg.thread_ts}`)
                        }
                        className="mt-2 text-blue-500 hover:underline"
                    >
                        スレッドを表示する
                    </button>
                    )}
                </div>
                ))}
            </div>
            )}
        </>
        )}

      {/* 固定ボタン */}
      <div className="fixed bottom-8 right-8 space-y-6">
        <button
          className="bg-gradient-to-r from-green-600 to-green-400 text-white p-6 rounded-full shadow-lg hover:scale-105 transform transition duration-300 ease-in-out hover:from-green-500 hover:to-green-300 focus:outline-none focus:ring-4 focus:ring-blue-300 font-semibold"
          onClick={() => router.push(`/${workspace}`)}
        >
          LIST
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

