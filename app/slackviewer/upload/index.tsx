"use client";

import { useEffect, useState } from "react";
import JSZip from "jszip";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const generateWorkspaceId = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
  };

  useEffect(() => {
    if (isUploading === false && workspaceId) {
      router.push(`/slackviewer/${workspaceId}`);
    }
  }, [isUploading, workspaceId]);


  const handleSubmit = async () => {
    if (!file) {
      alert("ファイルを選択してください");
      return;
    }
    if (!workspaceName) {
      alert("workspace名を入力してください");
      return;
    }

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const workspaceId = generateWorkspaceId();

    setIsUploading(true);

    try {
      // Step 1: チャンネル処理
      type ChannelRaw = {
        id: string;
        name: string;
      };

      type ChannelForm = {
        workspace: string;
        id: string;
        name: string;
      };

      async function uploadChannels(zipContent: JSZip, workspace: string) {
        const channelsFile = zipContent.file("channels.json");
        if (!channelsFile) {
          alert("channels.json が見つかりませんでした");
          return;
        }

        try {
          const channelsText = await channelsFile.async("string");
          const channelsRaw: ChannelRaw[] = JSON.parse(channelsText);

          const channelForms: ChannelForm[] = channelsRaw.map((ch) => ({
            workspace,
            id: ch.id,
            name: ch.name,
          }));

          const response = await fetch("https://my-java23-app-1053002991087.asia-northeast1.run.app/channels/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(channelForms),
          });

          if (!response.ok) {
            console.error("チャンネルのアップロードに失敗しました", await response.text());
          }
        } catch (error) {
          console.error("チャンネル読み込み・送信中にエラーが発生しました:", error);
        }
      }

      // Step 2: ユーザー処理
      type UserRaw = {
        id: string;
        profile: {
          real_name: string;
        };
      };

      type UserForm = {
        workspace: string;
        id: string;
        name: string;
      };

      async function uploadUsers(zipContent: JSZip, workspace: string) {
        const usersFile = zipContent.file("users.json");
        if (!usersFile) {
          alert("users.json が見つかりませんでした");
          return;
        }

        try {
          const usersText = await usersFile.async("string");
          const usersRaw: UserRaw[] = JSON.parse(usersText);

          const userForms: UserForm[] = usersRaw.map((user) => ({
            workspace,
            id: user.id,
            name: user.profile?.real_name ?? "",
          }));
          

          const response = await fetch("https://my-java23-app-1053002991087.asia-northeast1.run.app/users/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userForms),
          });

          if (!response.ok) {
            console.error("ユーザーのアップロードに失敗しました:", await response.text());
          }
        } catch (error) {
          console.error("ユーザー読み込み・送信中にエラーが発生しました:", error);
        }
      }

      // Step 3: メッセージ処理
      async function uploadMessages(zipContent: JSZip, workspace: string) {
        const folders = Object.keys(zipContent.files).filter((key) =>
          key.endsWith(".json") && key.includes("/") && !key.startsWith("__MACOSX")
        );

        for (const filePath of folders) {
          const channelName = filePath.split("/")[0];
          const msgFile = zipContent.file(filePath);
          if (msgFile) {
            const rawMessages = JSON.parse(await msgFile.async("string"));

            const msgForms = rawMessages.map((msg: any) => ({
              workspace,
              channel: channelName,
              userid: msg.user || "",
              text: msg.text || "",
              ts: msg.ts || "",
              thread_ts: msg.thread_ts || msg.threadTs || "",
            }));

            const response = await fetch("https://my-java23-app-1053002991087.asia-northeast1.run.app/messages/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(msgForms),
            });

            if (!response.ok) {
              console.error(`メッセージ(${filePath})のアップロードに失敗しました:`, await response.text());
            }
          }
        }
      }

      await uploadChannels(zipContent, workspaceId);
      await uploadUsers(zipContent, workspaceId);
      await uploadMessages(zipContent, workspaceId);
      setWorkspaceId(workspaceId);

    } catch (error) {
      alert("アップロード失敗: " + error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row bg-white text-gray-800">
      {/* 左側: アップロードフォーム */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-8 text-blue-600">Slack Viewer</h1>

        <input
          type="text"
          placeholder="workspace名を入力"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-64"
        />

        <label className="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-600 mb-4">
          zipファイルを選択
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {file && <p className="mb-4 text-gray-600">選択されたファイル: {file.name}</p>}

        <button
          onClick={handleSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          disabled={isUploading}
        >
          {isUploading ? "アップロード中..." : "送信"}
        </button>
      </div>
    </div>
  );}
