// app/helper/request/[requestId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    CheckCircle,
    MessageSquare,
    Phone,
    UserCircle2,
    CalendarDays,
    TicketIcon,
    Info,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// 수정된 부분: RawHelpRequestResponse와 HelpRequest 인터페이스 임포트, getGames 함수 임포트
import { getHelpRequestDetails, HelpRequest, RawHelpRequestResponse, getGames } from '@/lib/api'; // getGames 함수 추가 임포트

const statusMap = {
    REQUESTED: { text: '요청 접수', color: 'bg-gray-500', step: 1 },
    WAITING_FOR_HELPER: { text: '헬퍼 배정 대기 중', color: 'bg-yellow-500', step: 1 },
    IN_PROGRESS: { text: '도움 진행 중', color: 'bg-blue-500', step: 2 },
    TICKET_PROPOSED: { text: '티켓 정보 전달 완료', color: 'bg-orange-500', step: 3 },
    SEAT_CONFIRMED: { text: '좌석 확정! 경기 당일 만나요', color: 'bg-purple-500', step: 4 },
    COMPLETED: { text: '도움 완료', color: 'bg-green-500', step: 5 },
} as const;

type RequestStatus = keyof typeof statusMap;

const totalSteps = 5;

export default function HelperRequestDetailPage() {
    const router = useRouter();
    const params = useParams();
    const requestId = params.requestId as string;

    const [reservationDetails, setReservationDetails] = useState<HelpRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTicketDetails = async () => {
            if (!requestId) {
                setIsLoading(false);
                setError('확인할 요청 ID가 없습니다.');
                return;
            }
            try {
                setIsLoading(true);
                setError(null);
                // getHelpRequestDetails가 RawHelpRequestResponse를 반환합니다.
                const rawData: RawHelpRequestResponse = await getHelpRequestDetails(requestId);
                console.log('API로부터 받은 요청 상세 정보 (Raw):', rawData);

                let teamNameValue: string = '정보 없음';
                let gameDateValue: string = '정보 없음';
                let gameTimeValue: string | undefined = undefined;

                // game 필드가 숫자로 오는 경우, game 상세 정보를 별도로 조회
                if (typeof rawData.game === 'number') {
                    try {
                        // 백엔드 getGames API가 특정 gameId로 상세 조회를 지원한다고 가정
                        // 이 예시에서는 params로 gameId를 넘기지만, 실제 백엔드 API 명세를 확인해야 합니다.
                        // 만약 game 상세 조회용 특정 엔드포인트(예: /games/{gameId}/)가 있다면 그것을 사용해야 합니다.
                        const gameDetails = await getGames({ gameId: String(rawData.game) }); // gameId를 문자열로 전달
                        if (gameDetails && gameDetails.length > 0) {
                            const game = gameDetails[0]; // 첫 번째 결과 사용 (단일 gameId에 대한 결과라 가정)
                            teamNameValue = game.homeTeam.name;
                            gameDateValue = game.date;
                            gameTimeValue = game.time;
                        }
                    } catch (gameError) {
                        console.error('게임 상세 정보 불러오기 실패:', gameError);
                        // 게임 정보 로드 실패 시에도 요청 정보는 표시
                    }
                } else if (typeof rawData.game === 'object' && rawData.game !== null) {
                    // game 필드가 이미 객체로 오는 경우 (백엔드에서 Serializer가 Game 객체를 포함시킬 때)
                    // 이 부분은 현재 RawHelpRequestResponse의 game 타입(number)과 일치하지 않으므로,
                    // 백엔드에서 변경이 일어나면 이 로직이 작동할 것입니다.
                    const game = rawData.game as any; // GameDetail 타입으로 캐스팅 (주의: 백엔드 스키마에 따라 변경)
                    teamNameValue = game.homeTeam?.name || '정보 없음';
                    gameDateValue = game.date || '정보 없음';
                    gameTimeValue = game.time || undefined;
                }

                // 백엔드 데이터 구조와 프론트엔드 인터페이스를 매핑
                const mappedData: HelpRequest = {
                    id: String(rawData.requestId),
                    seniorFanName: rawData.userId.name,
                    teamName: teamNameValue,
                    gameDate: gameDateValue,
                    gameTime: gameTimeValue,
                    numberOfTickets: rawData.numberOfTickets,
                    notes: rawData.additionalInfo || undefined, // additionalInfo를 notes로 매핑, 빈 문자열이면 undefined
                    contactPreference: rawData.userId.phone ? 'phone' : 'chat', // 전화번호 있으면 'phone', 없으면 'chat'
                    phoneNumber: rawData.userId.phone, // userId.phone을 phoneNumber로 매핑
                    status: rawData.status, // 원본 status 그대로 사용
                    helperName: undefined, // 현재 데이터에 없음
                };

                if (mappedData.status && Object.keys(statusMap).includes(mappedData.status as RequestStatus)) {
                    setReservationDetails(mappedData);
                } else {
                    console.warn(`백엔드에서 알 수 없는 요청 상태를 받았습니다: ${mappedData.status}`);
                    setReservationDetails(mappedData);
                }
            } catch (err: any) {
                console.error('티켓 예매 정보를 불러오는 중 오류 발생:', err);
                setError(err.response?.data?.message || '티켓 예매 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTicketDetails();
    }, [requestId]);

    const handleMarkAsHelped = async () => {
        if (!reservationDetails) return;

        alert(`"${reservationDetails.seniorFanName}"님에게 티켓 정보를 전달하는 화면으로 이동합니다. (구현 필요)`);

        setTimeout(() => {
            alert('티켓 정보 전달이 시뮬레이션되었으며, 상태가 업데이트되었습니다.');
            router.push('/helper/dashboard');
        }, 1500);
    };

    const handleContact = () => {
        if (reservationDetails?.contactPreference === 'phone' && reservationDetails.phoneNumber) {
            alert(`전화 걸기: ${reservationDetails.phoneNumber}`);
        } else if (reservationDetails?.contactPreference === 'chat') {
            alert('채팅 기능은 현재 준비 중입니다. (구현 필요)');
        } else {
            alert('연락처 정보가 없거나 선호하는 연락 방법이 지정되지 않았습니다.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                <p className="text-xl text-gray-500">요청 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10">
                <p className="text-xl text-red-600 mb-6">{error}</p>
                <Link href="/helper/dashboard" passHref>
                    <Button variant="outline" className="text-lg">
                        <ArrowLeft className="mr-2 h-5 w-5" /> 대시보드로 돌아가기
                    </Button>
                </Link>
            </div>
        );
    }

    if (!reservationDetails) {
        return (
            <div className="text-center py-10">
                <p className="text-xl text-red-600 mb-6">요청 정보를 찾을 수 없습니다.</p>
                <Link href="/helper/dashboard" passHref>
                    <Button variant="outline" className="text-lg">
                        <ArrowLeft className="mr-2 h-5 w-5" /> 대시보드로 돌아가기
                    </Button>
                </Link>
            </div>
        );
    }

    const currentStatusInfo = reservationDetails?.status
        ? statusMap[reservationDetails.status as RequestStatus] || {
              text: '알 수 없음',
              color: 'bg-gray-400',
              step: 0,
          }
        : {
              text: '알 수 없음',
              color: 'bg-gray-400',
              step: 0,
          };

    const progressPercentage = (currentStatusInfo.step / totalSteps) * 100;

    return (
        <div className="py-8 max-w-3xl mx-auto">
            <Card className="shadow-xl">
                <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="text-md">
                            <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
                        </Button>
                        <span
                            className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${currentStatusInfo.color}`}
                        >
                            {currentStatusInfo.text}
                        </span>
                    </div>
                    <CardTitle className="text-3xl text-brand-navy flex items-center gap-3">
                        <UserCircle2 size={36} /> {reservationDetails?.seniorFanName}님의 예매 요청
                    </CardTitle>
                    <CardDescription className="text-lg pt-1">
                        아래 요청 세부사항을 확인하고 도움을 진행해주세요.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-1 text-sm text-gray-600">
                            <span>요청 접수</span>
                            <span>티켓 제안</span>
                            <span>좌석 확정</span>
                            <span>도움 완료</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                            <div
                                className={`${currentStatusInfo.color} h-3 rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <p className="text-center mt-2 text-md font-medium text-brand-navy-light">
                            현재 상태: {currentStatusInfo.text} ({currentStatusInfo.step}/{totalSteps} 단계)
                        </p>
                    </div>

                    <div className="border-t pt-6 space-y-4 text-lg">
                        <div className="flex items-start gap-3">
                            <TicketIcon className="text-brand-navy mt-1 flex-shrink-0" size={24} />
                            <div>
                                <span className="font-semibold text-gray-700">응원팀:</span>
                                <span className="ml-2 text-brand-navy-light font-bold">
                                    {reservationDetails?.teamName}
                                </span>{' '}
                                {/* 이제 mappedData에서 가져옵니다. */}
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CalendarDays className="text-brand-navy mt-1 flex-shrink-0" size={24} />
                            <div>
                                <span className="font-semibold text-gray-700">희망 경기일:</span>
                                <span className="ml-2 text-brand-navy-light font-bold">
                                    {reservationDetails?.gameDate} {/* 이제 mappedData에서 가져옵니다. */}
                                    {reservationDetails?.gameTime && `(${reservationDetails.gameTime})`}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Info className="text-brand-navy mt-1 flex-shrink-0" size={24} />{' '}
                            <div>
                                <span className="font-semibold text-gray-700">필요 티켓 수:</span>
                                <span className="ml-2 text-brand-navy-light font-bold">
                                    {reservationDetails?.numberOfTickets}매
                                </span>
                            </div>
                        </div>
                        {reservationDetails?.notes && (
                            <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-md">
                                <Info className="text-brand-sky mt-1 flex-shrink-0" size={24} />
                                <div>
                                    <span className="font-semibold text-gray-700">요청사항:</span>
                                    <p className="ml-2 text-gray-800 whitespace-pre-line">{reservationDetails.notes}</p>
                                </div>
                            </div>
                        )}

                        {reservationDetails?.phoneNumber && reservationDetails?.contactPreference === 'phone' && (
                            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-md">
                                <Phone className="text-brand-navy mt-1 flex-shrink-0" size={24} />
                                <div>
                                    <span className="font-semibold text-gray-700">연락처:</span>
                                    <p className="ml-2 text-gray-800">{reservationDetails.phoneNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-4 pt-8 border-t">
                    <Button
                        onClick={handleContact}
                        variant="outline"
                        className="w-full sm:flex-1 btn-touch-lg border-brand-navy text-brand-navy hover:bg-brand-sky/20 bg-white flex items-center justify-center gap-2"
                        disabled={!reservationDetails}
                    >
                        {reservationDetails?.contactPreference === 'phone' ? (
                            <Phone size={22} />
                        ) : (
                            <MessageSquare size={22} />
                        )}
                        <span>
                            {reservationDetails?.contactPreference === 'phone'
                                ? '어르신께 전화하기'
                                : '어르신과 채팅하기'}
                        </span>
                    </Button>
                    <Button
                        onClick={handleMarkAsHelped}
                        disabled={
                            !reservationDetails ||
                            reservationDetails.status === 'TICKET_PROPOSED' ||
                            reservationDetails.status === 'SEAT_CONFIRMED' ||
                            reservationDetails.status === 'COMPLETED'
                        }
                        className="w-full sm:flex-1 btn-touch-lg bg-brand-navy hover:bg-brand-navy-light text-white flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={22} />
                        <span>
                            {reservationDetails?.status === 'TICKET_PROPOSED' ||
                            reservationDetails?.status === 'SEAT_CONFIRMED' ||
                            reservationDetails?.status === 'COMPLETED'
                                ? '티켓 정보 전달 완료됨'
                                : '티켓 정보 전달하기'}
                        </span>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
