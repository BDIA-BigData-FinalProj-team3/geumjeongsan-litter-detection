package com.example.geumjeongsan.domain.staff;

import com.example.geumjeongsan.api.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final StaffUserRepository staffUserRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 로그인
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        StaffUser user = staffUserRepository.findByLoginId(request.getLoginId())
            .orElseThrow(() -> new RuntimeException("아이디 또는 비밀번호가 일치하지 않습니다."));

        // 계정 활성화 확인
        if (!user.getIsActive()) {
            throw new RuntimeException("비활성화된 계정입니다.");
        }

        // 비밀번호 확인 (BCrypt)
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("아이디 또는 비밀번호가 일치하지 않습니다.");
        }

        return toLoginResponse(user);
    }

    /**
     * 아이디 찾기
     */
    @Transactional(readOnly = true)
    public FindIdResponse findLoginId(FindIdRequest request) {
        Optional<StaffUser> userOpt = staffUserRepository
            .findByNameAndEmailAndPhone(request.getName(), request.getEmail(), request.getPhone());

        if (userOpt.isEmpty()) {
            return new FindIdResponse(false, null, "일치하는 정보가 없습니다.");
        }

        StaffUser user = userOpt.get();
        return new FindIdResponse(true, user.getLoginId(), "아이디를 찾았습니다.");
    }

    /**
     * 비밀번호 찾기 (평문으로 반환 - 개발용)
     */
    @Transactional(readOnly = true)
    public FindPasswordResponse findPassword(FindPasswordRequest request) {
        StaffUser user = staffUserRepository
            .findByLoginIdAndEmailAndPhone(request.getLoginId(), request.getEmail(), request.getPhone())
            .orElseThrow(() -> new RuntimeException("일치하는 정보가 없습니다."));

        // 주의: bcrypt 해시는 복호화 불가능
        // 실제로는 임시 비밀번호를 생성하거나, 비밀번호 재설정 링크를 보내야 함
        // 여기서는 개발 편의상 "비밀번호를 찾았습니다" 메시지만 반환
        return new FindPasswordResponse(true, null, "등록된 계정이 확인되었습니다. 관리자에게 문의하세요.");
    }

    private LoginResponse toLoginResponse(StaffUser user) {
        LoginResponse response = new LoginResponse();
        response.setUserId(user.getId());
        response.setLoginId(user.getLoginId());
        response.setName(user.getName());
        response.setRole(user.getRole());
        response.setDept(user.getDept());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        return response;
    }
}

