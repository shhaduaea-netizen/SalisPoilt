import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoster,
  createRosterCompany,
  createCompanyWithAdmin,
  addCompanyAssistant,
  createBranch,
  updateBranch,
  deleteBranch,
  removeRosterMember,
  resetMemberPassword,
  updateRosterMember,
  listRanks,
  createRank,
  updateRank,
  deleteRank,
  listPasswordRequests,
  createPasswordRequest,
  reviewPasswordRequest,
  type CreateCompanyWithAdminInput,
  type RosterMemberFields,
} from '@/features/roster/rosterApi';

export function useRosterList(viewerId: string) {
  return useQuery({
    queryKey: ['roster', 'list', viewerId],
    queryFn: fetchRoster,
  });
}

export function useCreateRosterCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createRosterCompany(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useCreateCompanyWithAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyWithAdminInput) => createCompanyWithAdmin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useUpdateRosterMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: RosterMemberFields }) => updateRosterMember(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useRemoveRosterMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRosterMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useResetMemberPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email, newPassword }: { id: string; email: string; newPassword: string }) =>
      resetMemberPassword(id, email, newPassword),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, companyId }: { name: string; companyId?: string }) => createBranch(name, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateBranch(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useRanks() {
  return useQuery({ queryKey: ['ranks'], queryFn: listRanks });
}

export function useCreateRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRank,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ranks'] }),
  });
}

export function useUpdateRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRank,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ranks'] }),
  });
}

export function useDeleteRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRank,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ranks'] }),
  });
}

export function usePasswordRequests() {
  return useQuery({ queryKey: ['password-requests'], queryFn: listPasswordRequests });
}

export function useCreatePasswordRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (browserFingerprint: string) => createPasswordRequest(browserFingerprint),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['password-requests'] }),
  });
}

export function useReviewPasswordRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      reviewPasswordRequest(id, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['password-requests'] }),
  });
}

export function useAddCompanyAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCompanyAssistant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}
