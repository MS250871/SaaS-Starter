import { CreateWorkspaceForm } from '@/modules/workspace/components/create-workspace-form';

export default function CreateWorkspacePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="mt-6 w-full max-w-sm xl:max-w-md">
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
