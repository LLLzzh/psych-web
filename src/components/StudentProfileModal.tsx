import { CameraOutlined, LoadingOutlined } from "@ant-design/icons";
import { Avatar, Button, DatePicker, Form, Input, Modal, Select, Upload, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { uploadStudentAvatar } from "../apis/file";
import { updateStudentProfile } from "../apis/profile";
import { useProfileStore } from "../store/profileStore";
import defaultAvatar from "../assets/user.svg";

interface ProfileFormValues {
  name: string;
  gender: number;
  birth: Dayjs | null;
}

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function StudentProfileModal({ open, onClose }: StudentProfileModalProps) {
  const [form] = Form.useForm<ProfileFormValues>();
  const { profile, setProfile } = useProfileStore();
  const [avatar, setAvatar] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setAvatar(profile.avatar || "");
    form.setFieldsValue({
      name: profile.name,
      gender: profile.gender || 0,
      birth: profile.birth > 0 ? dayjs.unix(profile.birth) : null,
    });
  }, [form, open, profile]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("请选择图片文件");
      return Upload.LIST_IGNORE;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error("头像不能超过 5MB");
      return Upload.LIST_IGNORE;
    }
    setIsUploading(true);
    try {
      const avatarUrl = await uploadStudentAvatar(file);
      setAvatar(avatarUrl);
      message.success("头像上传成功");
    } catch (error) {
      console.error("上传头像失败:", error);
      message.error("头像上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
    return false;
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setIsSaving(true);
    try {
      const nextProfile = await updateStudentProfile({
        name: values.name.trim(),
        gender: values.gender,
        birth: values.birth ? values.birth.startOf("day").unix() : 0,
        avatar,
      });
      setProfile(nextProfile);
      message.success("个人资料已保存");
      onClose();
    } catch (error) {
      console.error("保存学生资料失败:", error);
      message.error("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="个人资料"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col items-center pb-2 pt-3">
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={isUploading}
        >
          <button
            type="button"
            className="group relative block h-24 w-24 overflow-hidden rounded-full border-2 border-white bg-[#EEF1FF] shadow-[0_10px_30px_rgba(92,102,190,0.18)]"
            aria-label="上传头像"
          >
            <Avatar src={avatar || defaultAvatar} size={92} className="block" />
            <span className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-black/45 text-white transition-colors group-hover:bg-black/60">
              {isUploading ? <LoadingOutlined /> : <CameraOutlined />}
            </span>
          </button>
        </Upload>
        <span className="mt-2 text-xs text-gray-400">点击更换头像，支持 JPG、PNG，最大 5MB</span>
      </div>

      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }, { max: 30, message: "姓名不能超过 30 个字" }]}>
          <Input placeholder="请输入姓名" maxLength={30} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="性别" name="gender">
            <Select options={[{ value: 0, label: "未设置" }, { value: 1, label: "男" }, { value: 2, label: "女" }, { value: 3, label: "其他" }]} />
          </Form.Item>
          <Form.Item label="出生日期" name="birth">
            <DatePicker className="w-full" disabledDate={(date) => date.isAfter(dayjs(), "day")} />
          </Form.Item>
        </div>
        <div className="mb-5 rounded-xl bg-[#F6F7FC] px-4 py-3 text-sm text-[#73798D]">
          <span className="mr-4">学号：{profile?.code || "-"}</span>
          <span className="mr-4">年级：{profile?.grade || "-"}</span>
          <span>班级：{profile?.class || "-"}</span>
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={isSaving} disabled={isUploading} onClick={() => void handleSave()}>
            保存资料
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
